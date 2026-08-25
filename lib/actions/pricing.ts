"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/log";
import { auth } from "@/lib/auth";
import { runSmartGuard, type GuardResult } from "@/lib/engine/smartGuard";

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

const ruleSchema = z.object({
  name: z.string().trim().min(2, "Rule name is required").max(120),
  originPortId: z.string().trim().optional().or(z.literal("")),
  destinationPortId: z.string().trim().optional().or(z.literal("")),
  mode: z.enum(["FCL", "LCL", "AIR", "BULK"]).optional().or(z.literal("")),
  containerTypeId: z.string().trim().optional().or(z.literal("")),
  minWeightKg: z.coerce.number().min(0).optional().or(z.literal("")),
  maxWeightKg: z.coerce.number().min(0).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(1000).default(100),
  baseRate: z.coerce.number().min(0, "Base rate is required"),
  weightRate: z.coerce.number().min(0).optional().or(z.literal("")),
  fobExwType: z.enum(["FOB", "EXW", "NONE"]).default("NONE"),
  fobExwRate: z.coerce.number().min(0).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  fieldIds: z.array(z.string()).optional(),
  fieldValues: z.record(z.string(), z.coerce.number().nullable()).optional(),
});

export type PricingResult = { ok: boolean; error?: string };

function toRuleData(parsed: z.infer<typeof ruleSchema>) {
  return {
    name: parsed.name,
    originPortId: parsed.originPortId || null,
    destinationPortId: parsed.destinationPortId || null,
    mode: parsed.mode || null,
    containerTypeId: parsed.containerTypeId || null,
    minWeightKg: parsed.minWeightKg === "" || parsed.minWeightKg === undefined ? null : parsed.minWeightKg,
    maxWeightKg: parsed.maxWeightKg === "" || parsed.maxWeightKg === undefined ? null : parsed.maxWeightKg,
    priority: parsed.priority,
    baseRate: parsed.baseRate,
    weightRate: parsed.weightRate === "" || parsed.weightRate === undefined ? null : parsed.weightRate,
    fobExwType: parsed.fobExwType === "NONE" ? null : parsed.fobExwType,
    fobExwRate: parsed.fobExwType === "NONE" || parsed.fobExwRate === "" || parsed.fobExwRate === undefined ? null : parsed.fobExwRate,
    isActive: parsed.isActive ?? true,
  };
}

export async function createRule(formData: FormData): Promise<PricingResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  let rawValues: Record<string, string> = {};
  try {
    rawValues = JSON.parse(String(formData.get("fieldValues") ?? "{}"));
  } catch {
    rawValues = {};
  }
  const parsed = ruleSchema.safeParse({
    name: formData.get("name"),
    originPortId: formData.get("originPortId") ?? "",
    destinationPortId: formData.get("destinationPortId") ?? "",
    mode: formData.get("mode") ?? "",
    containerTypeId: formData.get("containerTypeId") ?? "",
    minWeightKg: formData.get("minWeightKg") ?? "",
    maxWeightKg: formData.get("maxWeightKg") ?? "",
    priority: formData.get("priority") ?? 100,
    baseRate: formData.get("baseRate") ?? 0,
    weightRate: formData.get("weightRate") ?? "",
    fobExwType: formData.get("fobExwType") ?? "NONE",
    fobExwRate: formData.get("fobExwRate") ?? "",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    fieldIds: formData.getAll("fieldIds").filter((v): v is string => typeof v === "string"),
    fieldValues: rawValues,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rule." };

  try {
    const rule = await prisma.$transaction(async (tx) => {
      const created = await tx.pricingRule.create({ data: toRuleData(parsed.data) });
      const fieldIds = parsed.data.fieldIds ?? [];
      if (fieldIds.length > 0) {
        await tx.pricingRuleField.createMany({
          data: fieldIds.map((fieldId) => ({
            ruleId: created.id,
            fieldId,
            isEnabled: true,
            value: parsed.data.fieldValues?.[fieldId] ?? undefined,
          })),
        });
      }
      return created;
    });
    await runSmartGuard();
    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "PRICING_RULE_CREATED",
      target: `rule:${rule.id}`,
      payload: { name: parsed.data.name },
    });
    revalidatePath("/admin/pricing");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to create rule." };
  }
}

export async function updateRule(formData: FormData): Promise<PricingResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  let rawValues: Record<string, string> = {};
  try {
    rawValues = JSON.parse(String(formData.get("fieldValues") ?? "{}"));
  } catch {
    rawValues = {};
  }
  const parsed = ruleSchema.safeParse({
    name: formData.get("name"),
    originPortId: formData.get("originPortId") ?? "",
    destinationPortId: formData.get("destinationPortId") ?? "",
    mode: formData.get("mode") ?? "",
    containerTypeId: formData.get("containerTypeId") ?? "",
    minWeightKg: formData.get("minWeightKg") ?? "",
    maxWeightKg: formData.get("maxWeightKg") ?? "",
    priority: formData.get("priority") ?? 100,
    baseRate: formData.get("baseRate") ?? 0,
    weightRate: formData.get("weightRate") ?? "",
    fobExwType: formData.get("fobExwType") ?? "NONE",
    fobExwRate: formData.get("fobExwRate") ?? "",
    isActive: formData.get("isActive") === "true",
    fieldIds: formData.getAll("fieldIds").filter((v): v is string => typeof v === "string"),
    fieldValues: rawValues,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid rule." };

  const existing = await prisma.pricingRule.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Rule not found." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.pricingRule.update({ where: { id }, data: toRuleData(parsed.data) });
      const fieldIds = parsed.data.fieldIds ?? [];
      if (fieldIds.length > 0) {
        await tx.pricingRuleField.deleteMany({ where: { ruleId: id } });
        await tx.pricingRuleField.createMany({
          data: fieldIds.map((fieldId) => ({
            ruleId: id,
            fieldId,
            isEnabled: true,
            value: parsed.data.fieldValues?.[fieldId] ?? undefined,
          })),
        });
      }
    });
    await runSmartGuard();
    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "PRICING_RULE_UPDATED",
      target: `rule:${id}`,
      payload: { name: parsed.data.name },
    });
    revalidatePath("/admin/pricing");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update rule." };
  }
}

export async function toggleRule(id: string): Promise<PricingResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const rule = await prisma.pricingRule.findUnique({ where: { id } });
  if (!rule) return { ok: false, error: "Rule not found." };

  await prisma.$transaction([
    prisma.pricingRule.update({ where: { id }, data: { isActive: !rule.isActive } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "PRICING_RULE_TOGGLED",
        target: `rule:${id}`,
        payload: { name: rule.name, isActive: !rule.isActive },
      },
    }),
  ]);
  await runSmartGuard();
  revalidatePath("/admin/pricing");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteRule(id: string): Promise<PricingResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const rule = await prisma.pricingRule.findUnique({ where: { id } });
  if (!rule) return { ok: false, error: "Rule not found." };

  await prisma.$transaction(async (tx) => {
    await tx.pricingRuleField.deleteMany({ where: { ruleId: id } });
    await tx.pricingRule.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "PRICING_RULE_DELETED",
        target: `rule:${id}`,
        payload: { name: rule.name },
      },
    });
  });
  await runSmartGuard();
  revalidatePath("/admin/pricing");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function runGuardNow(): Promise<{ ok: boolean; result?: GuardResult; error?: string }> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };
  const result = await runSmartGuard();
  return { ok: true, result };
}
