import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runSmartGuard, guardHealthBadge } from "@/lib/engine/smartGuard";
import { PricingMatrix, type RuleRow, type FieldRow, type PortOption, type AlertRow, type GuardReport } from "@/components/admin/pricing-matrix";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const [rules, fields, ports, containerTypes, health, alertRows, guard] = await Promise.all([
    prisma.pricingRule.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      include: {
        originPort: true,
        destinationPort: true,
        containerType: true,
        fields: { include: { field: true } },
      },
    }),
    prisma.fieldDefinition.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.port.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { country: true } }),
    prisma.containerType.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    guardHealthBadge(),
    prisma.systemAlert.findMany({ where: { isResolved: false }, orderBy: { createdAt: "desc" } }),
    runSmartGuard(),
  ]);

  const ruleRows: RuleRow[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    originPortId: r.originPortId,
    destinationPortId: r.destinationPortId,
    mode: r.mode,
    containerTypeId: r.containerTypeId,
    minWeightKg: Number(r.minWeightKg) || null,
    maxWeightKg: Number(r.maxWeightKg) || null,
    priority: r.priority,
    baseRate: Number(r.baseRate) || 0,
    weightRate: Number(r.weightRate) || null,
    fobExwType: r.fobExwType,
    fobExwRate: Number(r.fobExwRate) || null,
    isActive: r.isActive,
    originPortName: r.originPort?.name ?? null,
    destinationPortName: r.destinationPort?.name ?? null,
    containerName: r.containerType?.code ?? null,
    fields: r.fields.map((f) => ({
      id: f.id,
      fieldId: f.fieldId,
      value: Number(f.value) || null,
      isEnabled: f.isEnabled,
      key: f.field.key,
      label: f.field.label,
      unit: f.field.unit,
      icon: f.field.icon,
    })),
  }));

  const fieldRows: FieldRow[] = fields.map((f) => ({
    id: f.id,
    key: f.key,
    label: f.label,
    type: f.type,
    appliesTo: f.appliesTo,
    icon: f.icon,
    unit: f.unit,
    defaultValue: Number(f.defaultValue) || null,
    isEnabled: f.isEnabled,
    sortOrder: f.sortOrder,
  }));

  const portOptions: PortOption[] = ports.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    countryName: p.country?.name ?? null,
  }));

  const alertList: AlertRow[] = alertRows.map((a) => ({
    id: a.id,
    ruleId: a.ruleId,
    level: a.level,
    title: a.title,
    message: a.message,
    impact: a.impact,
    createdAt: a.createdAt.toISOString(),
  }));

  const guardReport: GuardReport = {
    health: guard.health,
    summary: guard.summary,
    alertsPersisted: guard.alertsPersisted,
    rules: guard.rules.map((r) => ({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      health: r.health,
      profitPct: r.profitPct,
      expectedTotal: r.expectedTotal,
      issues: r.issues,
    })),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pricing Matrix</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Smart pricing engine — rules compete by specificity (100% / 90% / 70%) and are blocked by the smart guard before going live.
        </p>
      </div>
      <PricingMatrix
        initialRules={ruleRows}
        fields={fieldRows}
        ports={portOptions}
        containerTypes={containerTypes.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
        healthBadge={{ health: guardReport.health, openAlerts: health.openAlerts }}
        guardReport={guardReport}
        alerts={alertList}
      />
    </div>
  );
}
