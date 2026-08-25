"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/log";
import { auth } from "@/auth";

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export type CurrencyResult = { ok: boolean; error?: string };

const currencySchema = z.object({
  code: z.string().trim().regex(/^[A-Z]{3}$/, "Code must be a 3-letter ISO code (e.g. SAR)").toUpperCase(),
  name: z.string().trim().min(2).max(80),
  symbol: z.string().trim().max(6).optional().or(z.literal("")),
  rate: z.coerce.number().min(0.000001, "Rate must be greater than 0"),
  isActive: z.boolean().optional(),
});

export async function createCurrency(formData: FormData): Promise<CurrencyResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const parsed = currencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    symbol: formData.get("symbol") ?? "",
    rate: formData.get("rate") ?? 1,
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid currency." };

  try {
    const currency = await prisma.currency.create({
      data: { code: parsed.data.code, name: parsed.data.name, symbol: parsed.data.symbol || "", rate: parsed.data.rate, isActive: parsed.data.isActive ?? true },
    });
    await prisma.exchangeRate.upsert({
      where: { currency: parsed.data.code },
      update: { rate: parsed.data.rate },
      create: { currency: parsed.data.code, rate: parsed.data.rate },
    });
    await audit({ actorId: session.user.id, actorRole: session.user.role, action: "CURRENCY_CREATED", target: `currency:${currency.id}`, payload: { code: currency.code } });
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "This currency code already exists." };
    return { ok: false, error: "Failed to create currency." };
  }
}

export async function updateCurrency(formData: FormData): Promise<CurrencyResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = currencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    symbol: formData.get("symbol") ?? "",
    rate: formData.get("rate") ?? 1,
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid currency." };

  const existing = await prisma.currency.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Currency not found." };

  await prisma.currency.update({
    where: { id },
    data: { name: parsed.data.name, symbol: parsed.data.symbol || "", rate: parsed.data.rate, isActive: parsed.data.isActive },
  });
  await prisma.exchangeRate.upsert({
    where: { currency: existing.code },
    update: { rate: parsed.data.rate },
    create: { currency: existing.code, rate: parsed.data.rate },
  });
  await audit({ actorId: session.user.id, actorRole: session.user.role, action: "CURRENCY_UPDATED", target: `currency:${id}`, payload: { code: parsed.data.code } });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setDefaultCurrency(id: string): Promise<CurrencyResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const currency = await prisma.currency.findUnique({ where: { id } });
  if (!currency) return { ok: false, error: "Currency not found." };
  if (currency.code === "SAR") {
    await audit({ actorId: session.user.id, actorRole: session.user.role, action: "CURRENCY_DEFAULT", target: `currency:${id}`, payload: { code: currency.code } });
    return { ok: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.currency.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    await tx.currency.update({ where: { id }, data: { isDefault: true } });
    await tx.systemSetting.upsert({
      where: { key: "defaults.currency" },
      update: { value: currency.code, category: "DEFAULTS" },
      create: { key: "defaults.currency", value: currency.code, category: "DEFAULTS" },
    });
    await tx.auditLog.create({
      data: { actorId: session.user.id, actorRole: session.user.role, action: "CURRENCY_DEFAULT", target: `currency:${id}`, payload: { code: currency.code } },
    });
  });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCurrency(id: string): Promise<CurrencyResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const currency = await prisma.currency.findUnique({ where: { id } });
  if (!currency) return { ok: false, error: "Currency not found." };
  if (currency.isDefault) return { ok: false, error: "The default currency cannot be deleted." };
  if (currency.code === "SAR") return { ok: false, error: "SAR cannot be deleted." };

  await prisma.$transaction(async (tx) => {
    await tx.exchangeRate.delete({ where: { currency: currency.code } }).catch(() => {});
    await tx.currency.delete({ where: { id } });
    await tx.auditLog.create({
      data: { actorId: session.user.id, actorRole: session.user.role, action: "CURRENCY_DELETED", target: `currency:${id}`, payload: { code: currency.code } },
    });
  });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
