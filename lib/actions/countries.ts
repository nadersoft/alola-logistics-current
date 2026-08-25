"use server";

import { z } from "zod";
import { PortType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/log";
import { auth } from "@/lib/auth";

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export type CountryResult = { ok: boolean; error?: string };

const countrySchema = z.object({
  code: z.string().trim().regex(/^[A-Z]{2}$/, "Code must be a 2-letter ISO code (e.g. SA)").toUpperCase(),
  name: z.string().trim().min(2).max(80),
  dialCode: z.string().trim().max(8).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function createCountry(formData: FormData): Promise<CountryResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const parsed = countrySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    dialCode: formData.get("dialCode") ?? "",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid country." };

  try {
    const country = await prisma.country.create({
      data: { code: parsed.data.code, name: parsed.data.name, dialCode: parsed.data.dialCode || null, isActive: parsed.data.isActive ?? true },
    });
    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "COUNTRY_CREATED",
      target: `country:${country.id}`,
      payload: { code: country.code },
    });
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "This country code already exists." };
    return { ok: false, error: "Failed to create country." };
  }
}

export async function updateCountry(formData: FormData): Promise<CountryResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = countrySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    dialCode: formData.get("dialCode") ?? "",
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid country." };

  const existing = await prisma.country.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Country not found." };
  if (existing.code !== parsed.data.code) return { ok: false, error: "Country code cannot be changed." };

  await prisma.country.update({
    where: { id },
    data: { name: parsed.data.name, dialCode: parsed.data.dialCode || null, isActive: parsed.data.isActive },
  });
  await audit({ actorId: session.user.id, actorRole: session.user.role, action: "COUNTRY_UPDATED", target: `country:${id}`, payload: { code: parsed.data.code } });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteCountry(id: string): Promise<CountryResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const country = await prisma.country.findUnique({ where: { id }, include: { _count: { select: { ports: true } } } });
  if (!country) return { ok: false, error: "Country not found." };
  if (country._count.ports > 0) return { ok: false, error: "This country has ports assigned. Move them first." };

  await prisma.$transaction([
    prisma.country.delete({ where: { id } }),
    prisma.auditLog.create({
      data: { actorId: session.user.id, actorRole: session.user.role, action: "COUNTRY_DELETED", target: `country:${id}`, payload: { code: country.code } },
    }),
  ]);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Ports ----------

const portSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9]{2,6}$/, "Invalid port code").toUpperCase(),
  name: z.string().trim().min(2).max(120),
  countryId: z.string().trim().optional().or(z.literal("")),
  type: z.enum([PortType.SEA, PortType.AIR, PortType.LAND]),
  isActive: z.boolean().optional(),
});

export async function createPort(formData: FormData): Promise<CountryResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const parsed = portSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    countryId: formData.get("countryId") ?? "",
    type: formData.get("type") ?? PortType.SEA,
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid port." };

  try {
    const port = await prisma.port.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        countryId: parsed.data.countryId || null,
        type: parsed.data.type,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await audit({ actorId: session.user.id, actorRole: session.user.role, action: "PORT_CREATED", target: `port:${port.id}`, payload: { code: port.code } });
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "This port code already exists." };
    return { ok: false, error: "Failed to create port." };
  }
}

export async function updatePort(formData: FormData): Promise<CountryResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = portSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    countryId: formData.get("countryId") ?? "",
    type: formData.get("type") ?? PortType.SEA,
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid port." };

  const existing = await prisma.port.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Port not found." };
  if (existing.code !== parsed.data.code) return { ok: false, error: "Port code cannot be changed." };

  await prisma.port.update({
    where: { id },
    data: { name: parsed.data.name, countryId: parsed.data.countryId || null, type: parsed.data.type, isActive: parsed.data.isActive },
  });
  await audit({ actorId: session.user.id, actorRole: session.user.role, action: "PORT_UPDATED", target: `port:${id}`, payload: { code: parsed.data.code } });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePort(id: string): Promise<CountryResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const port = await prisma.port.findUnique({ where: { id }, include: { _count: { select: { shipmentsFrom: true, ratesFrom: true, quotesFrom: true, rulesFrom: true } } } });
  if (!port) return { ok: false, error: "Port not found." };
  const usage = port._count.shipmentsFrom + port._count.ratesFrom + port._count.quotesFrom + port._count.rulesFrom;
  if (usage > 0) return { ok: false, error: "This port is referenced by shipments, rates, quotes or rules." };

  await prisma.$transaction([
    prisma.port.delete({ where: { id } }),
    prisma.auditLog.create({
      data: { actorId: session.user.id, actorRole: session.user.role, action: "PORT_DELETED", target: `port:${id}`, payload: { code: port.code } },
    }),
  ]);
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
