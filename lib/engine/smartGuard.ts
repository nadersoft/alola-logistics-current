/**
 * Smart pricing guard (feature 5) — financial & data-integrity watchdog.
 * Detects conflicts before they reach customers:
 *   CRITICAL — overlapping weight ranges on the same lane, or selling below base rate.
 *   HIGH     — DG / Reefer enabled with a zero fee, or FCL rule without a container type.
 *   MEDIUM   — thin (<5%) or excessive (>70%) margin, identical origin/destination.
 */
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/calculation";
import { computeBreakdown, getActiveRules, type MatchContext, type RuleBrief } from "@/lib/engine/ruleMatcher";

export type GuardIssue = {
  level: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  message: string;
  impact?: string;
};

export type GuardRuleReport = {
  ruleId: string;
  ruleName: string;
  health: "critical" | "warning" | "healthy";
  profitPct: number;
  expectedTotal: number;
  issues: GuardIssue[];
};

export type GuardResult = {
  health: "critical" | "warning" | "healthy";
  summary: { rules: number; critical: number; high: number; medium: number; info: number };
  rules: GuardRuleReport[];
  alertsPersisted: number;
};

const laneKey = (r: RuleBrief) => `${r.originPortId ?? "*"}|${r.destinationPortId ?? "*"}|${r.mode ?? "*"}|${r.containerTypeId ?? "*"}`;

function rangesOverlap(a: { min: number | null; max: number | null }, b: { min: number | null; max: number | null }): boolean {
  const aLo = a.min ?? -Infinity;
  const aHi = a.max ?? Infinity;
  const bLo = b.min ?? -Infinity;
  const bHi = b.max ?? Infinity;
  return !(aHi < bLo || bHi < aLo);
}

function analyzeRule(rule: RuleBrief): GuardRuleReport {
  const issues: GuardIssue[] = [];
  const ctx: MatchContext = {
    originPortId: rule.originPortId,
    destinationPortId: rule.destinationPortId,
    mode: rule.mode,
    containerTypeId: rule.containerTypeId,
    weightKg: rule.minWeightKg ? rule.minWeightKg : rule.maxWeightKg ? rule.maxWeightKg : 1000,
    containers: 1,
  };
  const bd = computeBreakdown(rule, ctx);
  const total = bd.total;
  const base = bd.base;

  const dg = rule.fields.find((f) => f.field.key === "dg");
  const reefer = rule.fields.find((f) => f.field.key === "reefer");

  if (rule.mode === "FCL" && !rule.containerTypeId) {
    issues.push({
      level: "HIGH",
      title: "FCL rule has no container type",
      message: `Rule "${rule.name}" is FCL but has no container type — the matched price is ambiguous.`,
      impact: "Ambiguous container pricing can cause revenue leakage.",
    });
  }

  if (dg && (!dg.value || dg.value === 0)) {
    issues.push({
      level: "HIGH",
      title: "Dangerous-goods fee missing",
      message: `Rule "${rule.name}" enables the DG field but no fee is set.`,
      impact: "DG surcharge is silently dropped on hazardous shipments.",
    });
  }
  if (reefer && (!reefer.value || reefer.value === 0)) {
    issues.push({
      level: "HIGH",
      title: "Reefer fee missing",
      message: `Rule "${rule.name}" enables the Reefer field but no fee is set.`,
      impact: "Reefer handling is priced at zero.",
    });
  }

  const flatCost = rule.fields.filter((f) => f.isEnabled && f.value != null && f.field.unit !== "%").reduce((s, f) => s + f.value!, 0);
  const pctPts = rule.fields.filter((f) => f.isEnabled && f.value != null && f.field.unit === "%").reduce((s, f) => s + f.value!, 0);
  const subtotal = base + flatCost;
  const margin = round2(bd.fobExw + bd.weightFee + (subtotal * pctPts) / 100);
  const profitPct = total > 0 ? round2((margin / total) * 100) : 0;

  if (total < base) {
    issues.push({
      level: "CRITICAL",
      title: "Selling below base rate",
      message: `Rule "${rule.name}" totals ${total} which is below its base rate (${base}).`,
      impact: `Guaranteed loss of ${round2(base - total)} per unit on every shipment.`,
    });
  }
  if (profitPct < 5) {
    issues.push({
      level: "MEDIUM",
      title: "Thin margin",
      message: `Rule "${rule.name}" earns ${profitPct}% — below the 5% health threshold.`,
      impact: `${profitPct}% margin leaves no room for operational variance.`,
    });
  }
  if (profitPct > 70) {
    issues.push({
      level: "MEDIUM",
      title: "Suspicious margin",
      message: `Rule "${rule.name}" earns ${profitPct}% — above the 70% health threshold.`,
      impact: "Overpriced lane may push customers to competitors.",
    });
  }
  if (rule.originPortId && rule.originPortId === rule.destinationPortId) {
    issues.push({
      level: "INFO",
      title: "Origin equals destination",
      message: `Rule "${rule.name}" prices a shipment between the same port.`,
    });
  }

  const hasCritical = issues.some((i) => i.level === "CRITICAL");
  const hasHigh = issues.some((i) => i.level === "HIGH");
  const health = hasCritical ? "critical" : hasHigh ? "warning" : "healthy";

  return { ruleId: rule.id, ruleName: rule.name, health, profitPct, expectedTotal: total, issues };
}

export async function runSmartGuard(): Promise<GuardResult> {
  const rules = await getActiveRules();
  const reports = rules.map(analyzeRule);

  const critical = reports.flatMap((r) => r.issues).filter((i) => i.level === "CRITICAL").length;
  const high = reports.flatMap((r) => r.issues).filter((i) => i.level === "HIGH").length;
  const medium = reports.flatMap((r) => r.issues).filter((i) => i.level === "MEDIUM").length;
  const info = reports.flatMap((r) => r.issues).filter((i) => i.level === "INFO").length;

  // Weight-range overlap detection across the whole matrix.
  const byLane = new Map<string, RuleBrief[]>();
  for (const r of rules) {
    const k = laneKey(r);
    const arr = byLane.get(k) ?? [];
    arr.push(r);
    byLane.set(k, arr);
  }
  for (const [, group] of byLane) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (rangesOverlap({ min: a.minWeightKg, max: a.maxWeightKg }, { min: b.minWeightKg, max: b.maxWeightKg })) {
          reports
            .filter((rep) => rep.ruleId === a.id || rep.ruleId === b.id)
            .forEach((rep) => {
              rep.health = "critical";
              rep.issues.unshift({
                level: "CRITICAL",
                title: "Overlapping weight ranges",
                message: `Rules "${a.name}" and "${b.name}" both cover the same lane with overlapping weight ranges.`,
                impact: "Customers can be quoted two conflicting prices on the same lane.",
              });
            });
        }
      }
    }
  }

  const summary = { rules: rules.length, critical, high, medium, info };
  const health: GuardResult["health"] = critical > 0 ? "critical" : high > 0 ? "warning" : "healthy";

  let alertsPersisted = 0;
  await prisma.$transaction(async (tx) => {
    const unresolved = await tx.systemAlert.findMany({ where: { isResolved: false } });
    const liveKeys = new Set<string>();

    const persist = (ruleId: string | null, issue: GuardIssue) => {
      if (issue.level !== "CRITICAL" && issue.level !== "HIGH") return;
      const key = `${ruleId ?? "global"}|${issue.title}`;
      liveKeys.add(key);
      const existing = unresolved.find((a) => a.ruleId === ruleId && a.title === issue.title);
      if (!existing) {
        alertsPersisted += 1;
        return tx.systemAlert.create({
          data: { ruleId, level: issue.level, title: issue.title, message: issue.message, impact: issue.impact ? { note: issue.impact } : undefined },
        });
      }
      return null;
    };

    for (const rep of reports) {
      for (const issue of rep.issues) await persist(rep.ruleId, issue);
    }

    // Resolve alerts that no longer apply.
    for (const existing of unresolved) {
      const key = `${existing.ruleId ?? "global"}|${existing.title}`;
      if (!liveKeys.has(key) && existing.ruleId) {
        await tx.systemAlert.update({ where: { id: existing.id }, data: { isResolved: true, resolvedAt: new Date() } });
      }
    }
  });

  return { health, summary, rules: reports, alertsPersisted };
}

export async function guardHealthBadge(): Promise<{ health: GuardResult["health"]; openAlerts: number }> {
  const [openAlerts, critical, high] = await Promise.all([
    prisma.systemAlert.count({ where: { isResolved: false } }),
    prisma.systemAlert.count({ where: { isResolved: false, level: "CRITICAL" } }),
    prisma.systemAlert.count({ where: { isResolved: false, level: "HIGH" } }),
  ]);
  const health = critical > 0 ? "critical" : high > 0 ? "warning" : openAlerts > 0 ? "warning" : "healthy";
  return { health, openAlerts };
}
