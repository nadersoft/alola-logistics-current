"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/log";
import { auth } from "@/lib/auth";

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

const fieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers or underscores").min(2).max(40),
  label: z.string().trim().min(2).max(80),
  type: z.enum(["number", "boolean", "select", "text"]),
  appliesTo: z.enum(["ALL", "FCL", "LCL", "AIR"]),
  icon: z.string().trim().max(30).optional().or(z.literal("")),
  unit: z.string().trim().max(10).optional().or(z.literal("")),
  defaultValue: z.coerce.number().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isEnabled: z.boolean().optional(),
});

export type FieldResult = { ok: boolean; error?: string };

export async function createField(formData: FormData): Promise<FieldResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const parsed = fieldSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    type: formData.get("type") ?? "number",
    appliesTo: formData.get("appliesTo") ?? "ALL",
    icon: formData.get("icon") ?? "",
    unit: formData.get("unit") ?? "",
    defaultValue: formData.get("defaultValue") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isEnabled: formData.get("isEnabled") === "true" || formData.get("isEnabled") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid field." };

  const data = parsed.data;
  try {
    const field = await prisma.fieldDefinition.create({
      data: {
        key: data.key,
        label: data.label,
        type: data.type,
        appliesTo: data.appliesTo,
        icon: data.icon || null,
        unit: data.unit || null,
        defaultValue: data.defaultValue === "" || data.defaultValue === undefined ? null : data.defaultValue,
        sortOrder: data.sortOrder,
        isEnabled: data.isEnabled ?? true,
      },
    });
    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "FIELD_CREATED",
      target: `field:${field.id}`,
      payload: { key: data.key },
    });
    revalidatePath("/admin/pricing");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A field with this key already exists." };
    return { ok: false, error: "Failed to create field." };
  }
}

export async function updateField(formData: FormData): Promise<FieldResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = fieldSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    type: formData.get("type") ?? "number",
    appliesTo: formData.get("appliesTo") ?? "ALL",
    icon: formData.get("icon") ?? "",
    unit: formData.get("unit") ?? "",
    defaultValue: formData.get("defaultValue") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
    isEnabled: formData.get("isEnabled") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid field." };

  const data = parsed.data;
  const existing = await prisma.fieldDefinition.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Field not found." };
  if (existing.key !== data.key) return { ok: false, error: "Field key cannot be changed." };

  await prisma.fieldDefinition.update({
    where: { id },
    data: {
      label: data.label,
      type: data.type,
      appliesTo: data.appliesTo,
      icon: data.icon || null,
      unit: data.unit || null,
      defaultValue: data.defaultValue === "" || data.defaultValue === undefined ? null : data.defaultValue,
      sortOrder: data.sortOrder,
      isEnabled: data.isEnabled,
    },
  });
  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "FIELD_UPDATED",
    target: `field:${id}`,
    payload: { key: data.key },
  });
  revalidatePath("/admin/pricing");
  return { ok: true };
}

export async function deleteField(id: string): Promise<FieldResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const field = await prisma.fieldDefinition.findUnique({ where: { id }, include: { _count: { select: { ruleFields: true } } } });
  if (!field) return { ok: false, error: "Field not found." };
  if (field._count.ruleFields > 0) return { ok: false, error: "This field is used by pricing rules. Remove it from those rules first." };

  await prisma.$transaction([
    prisma.fieldDefinition.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "FIELD_DELETED",
        target: `field:${id}`,
        payload: { key: field.key },
      },
    }),
  ]);
  revalidatePath("/admin/pricing");
  return { ok: true };
}
