/**
 * Smart pricing engine — Rule Matcher (feature 5/9).
 * Rules compete by specificity with a match priority of 100% / 90% / 70%.
 *   - 100%: exact lane (origin + destination + mode + container type)
 *   - 90% : origin + destination + mode (container differs / unspecified)
 *   - 70% : mode only (any lane)
 *
 * Formula (feature 9):
 *   Total = FCL_BASIC_RATE (per container) + SUM(enabled fields) + FOB/EXW + (weight × rate/kg)
 */
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/calculation";

export type MatchContext = {
  originPortId?: string | null;
  destinationPortId?: string | null;
  mode?: string | null;
  containerTypeId?: string | null;
  weightKg?: number;
  containers?: number;
};

export type FieldDefinitionBrief = {
  key: string;
  label: string;
  unit: string | null;
  type: string;
};

export type RuleFieldBrief = {
  id: string;
  isEnabled: boolean;
  value: number | null;
  field: FieldDefinitionBrief;
};

export type RuleBrief = {
  id: string;
  name: string;
  originPortId: string | null;
  destinationPortId: string | null;
  mode: string | null;
  containerTypeId: string | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  priority: number;
  baseRate: number;
  weightRate: number | null;
  fobExwType: string | null;
  fobExwRate: number | null;
  isActive: boolean;
  fields: RuleFieldBrief[];
};

export type CostBreakdown = {
  base: number;
  baseLabel: string;
  fields: { key: string; label: string; amount: number; unit: string | null }[];
  fobExw: number;
  weightFee: number;
  total: number;
};

export type MatchedRule = {
  rule: RuleBrief;
  matchPct: 100 | 90 | 70;
  breakdown: CostBreakdown;
  weightApplied: number;
};

type PrismaRule = Awaited<ReturnType<typeof prisma.pricingRule.findFirst>> & {
  fields: { id: string; isEnabled: boolean; value: { toNumber(): number } | null; field: { key: string; label: string; unit: string | null; type: string } }[];
};

export function serializeRule(rule: PrismaRule): RuleBrief {
  return {
    id: rule.id,
    name: rule.name,
    originPortId: rule.originPortId,
    destinationPortId: rule.destinationPortId,
    mode: rule.mode,
    containerTypeId: rule.containerTypeId,
    minWeightKg: Number(rule.minWeightKg) || null,
    maxWeightKg: Number(rule.maxWeightKg) || null,
    priority: rule.priority,
    baseRate: Number(rule.baseRate) || 0,
    weightRate: Number(rule.weightRate) || null,
    fobExwType: rule.fobExwType,
    fobExwRate: Number(rule.fobExwRate) || null,
    isActive: rule.isActive,
    fields: (rule.fields ?? []).map((f) => ({
      id: f.id,
      isEnabled: f.isEnabled,
      value: Number(f.value) || null,
      field: { key: f.field.key, label: f.field.label, unit: f.field.unit, type: f.field.type },
    })),
  };
}

export function ruleMatchPct(rule: RuleBrief, ctx: MatchContext): 100 | 90 | 70 | null {
  const modeMatch = rule.mode != null && ctx.mode != null && rule.mode === ctx.mode;
  if (!modeMatch) return null;

  const originMatch = rule.originPortId != null && ctx.originPortId != null && rule.originPortId === ctx.originPortId;
  const destMatch = rule.destinationPortId != null && ctx.destinationPortId != null && rule.destinationPortId === ctx.destinationPortId;
  const containerMatch = rule.containerTypeId != null && ctx.containerTypeId != null && rule.containerTypeId === ctx.containerTypeId;

  const laneMatch = originMatch && destMatch;
  if (laneMatch && containerMatch) return 100;
  if (laneMatch) return 90;
  return 70;
}

export function weightInRange(rule: RuleBrief, weightKg?: number): boolean {
  if (weightKg == null) return true;
  if (rule.minWeightKg != null && weightKg < rule.minWeightKg) return false;
  if (rule.maxWeightKg != null && weightKg > rule.maxWeightKg) return false;
  return true;
}

/** Total = base(×containers) + enabled fields (+ pct fields on subtotal) + FOB/EXW + weight×rate. */
export function computeBreakdown(rule: RuleBrief, ctx: MatchContext): CostBreakdown {
  const containers = Math.max(1, ctx.containers ?? 1);
  const base = rule.baseRate * containers;
  const weightApplied = ctx.weightKg ?? 0;

  let flat = 0;
  let pct = 0;
  const fieldRows: CostBreakdown["fields"] = [];
  for (const f of rule.fields) {
    if (!f.isEnabled || f.value == null) continue;
    const isPct = f.field.unit === "%";
    if (isPct) {
      pct += f.value;
    } else {
      flat += f.value;
    }
    fieldRows.push({ key: f.field.key, label: f.field.label, amount: round2(f.value), unit: f.field.unit });
  }

  const subtotal = base + flat;
  const pctTotal = subtotal * (1 + pct / 100);
  const fobExw = rule.fobExwType && rule.fobExwRate != null ? rule.fobExwRate : 0;
  const weightFee = rule.weightRate ? weightApplied * rule.weightRate : 0;

  return {
    base,
    baseLabel: rule.mode === "FCL" ? "FCL basic rate (per container)" : "Basic rate",
    fields: fieldRows,
    fobExw: round2(fobExw),
    weightFee: round2(weightFee),
    total: round2(pctTotal + fobExw + weightFee),
  };
}

export async function getActiveRules(): Promise<RuleBrief[]> {
  const rows = await prisma.pricingRule.findMany({
    where: { isActive: true },
    include: { fields: { where: { isEnabled: true }, include: { field: true } } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
  });
  return rows.map(serializeRule);
}

/** Best matching active rule for a context, or null when none matches. */
export async function matchBestRule(ctx: MatchContext): Promise<MatchedRule | null> {
  const rules = await getActiveRules();
  let best: { rule: RuleBrief; pct: 100 | 90 | 70 } | null = null;

  for (const rule of rules) {
    if (!weightInRange(rule, ctx.weightKg)) continue;
    const pct = ruleMatchPct(rule, ctx);
    if (pct == null) continue;
    if (!best || pct > best.pct || (pct === best.pct && rule.priority > best.rule.priority)) {
      best = { rule, pct };
    }
  }

  if (!best) return null;
  return { rule: best.rule, matchPct: best.pct, breakdown: computeBreakdown(best.rule, ctx), weightApplied: ctx.weightKg ?? 0 };
}
