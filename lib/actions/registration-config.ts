"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, logger } from "@/lib/log";
import { auth } from "@/auth";

export type RegistrationConfigResult = { ok: boolean; error?: string };

// ---------- RBAC permissions (9) ----------

export type RegistrationPermission =
  | "REGISTRATION_BUILDER_VIEW"
  | "PAGE_CONFIG_UPDATE"
  | "FIELD_CREATE"
  | "FIELD_UPDATE"
  | "FIELD_DELETE"
  | "FIELD_TOGGLE_VISIBLE"
  | "FIELD_TOGGLE_REQUIRED"
  | "FIELD_TOGGLE_ACTIVE"
  | "FIELD_REORDER";

const PERMISSION_ROLES: Record<RegistrationPermission, string[]> = {
  REGISTRATION_BUILDER_VIEW: ["SUPER_ADMIN", "MANAGER", "SUPPORT"],
  PAGE_CONFIG_UPDATE: ["SUPER_ADMIN", "MANAGER"],
  FIELD_CREATE: ["SUPER_ADMIN", "MANAGER"],
  FIELD_UPDATE: ["SUPER_ADMIN", "MANAGER"],
  FIELD_DELETE: ["SUPER_ADMIN"],
  FIELD_TOGGLE_VISIBLE: ["SUPER_ADMIN", "MANAGER"],
  FIELD_TOGGLE_REQUIRED: ["SUPER_ADMIN", "MANAGER"],
  FIELD_TOGGLE_ACTIVE: ["SUPER_ADMIN", "MANAGER"],
  FIELD_REORDER: ["SUPER_ADMIN", "MANAGER"],
};

async function requirePermission(permission: RegistrationPermission): Promise<{ actorId: string; actorRole: string } | null> {
  const session = await auth();
  const role = session?.user?.role ?? null;
  if (!session?.user || !role || !PERMISSION_ROLES[permission].includes(role)) return null;
  return { actorId: session.user.id ?? "unknown", actorRole: role };
}

function revalidateRegistration() {
  revalidatePath("/admin/settings/registration-builder");
  revalidatePath("/auth/register", "page");
  revalidatePath("/", "layout");
}

// ---------- Page config ----------

const pageConfigSchema = z.object({
  pageTitleAr: z.string().trim().min(1).max(120),
  pageTitleEn: z.string().trim().min(1).max(120),
  pageSubtitleAr: z.string().trim().max(300).optional().or(z.literal("")),
  pageSubtitleEn: z.string().trim().max(300).optional().or(z.literal("")),
  submitButtonAr: z.string().trim().min(1).max(120),
  submitButtonEn: z.string().trim().min(1).max(120),
  successToastAr: z.string().trim().max(300).optional().or(z.literal("")),
  successToastEn: z.string().trim().max(300).optional().or(z.literal("")),
  errorGeneralAr: z.string().trim().max(300).optional().or(z.literal("")),
  errorGeneralEn: z.string().trim().max(300).optional().or(z.literal("")),
  footerLoginTextAr: z.string().trim().max(300).optional().or(z.literal("")),
  footerLoginTextEn: z.string().trim().max(300).optional().or(z.literal("")),
  alreadyHaveAccountAr: z.string().trim().max(120).optional().or(z.literal("")),
  alreadyHaveAccountEn: z.string().trim().max(120).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function updateRegistrationPageConfig(formData: FormData): Promise<RegistrationConfigResult> {
  const actor = await requirePermission("PAGE_CONFIG_UPDATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = pageConfigSchema.safeParse({
    pageTitleAr: formData.get("pageTitleAr"),
    pageTitleEn: formData.get("pageTitleEn"),
    pageSubtitleAr: formData.get("pageSubtitleAr") ?? "",
    pageSubtitleEn: formData.get("pageSubtitleEn") ?? "",
    submitButtonAr: formData.get("submitButtonAr"),
    submitButtonEn: formData.get("submitButtonEn"),
    successToastAr: formData.get("successToastAr") ?? "",
    successToastEn: formData.get("successToastEn") ?? "",
    errorGeneralAr: formData.get("errorGeneralAr") ?? "",
    errorGeneralEn: formData.get("errorGeneralEn") ?? "",
    footerLoginTextAr: formData.get("footerLoginTextAr") ?? "",
    footerLoginTextEn: formData.get("footerLoginTextEn") ?? "",
    alreadyHaveAccountAr: formData.get("alreadyHaveAccountAr") ?? "",
    alreadyHaveAccountEn: formData.get("alreadyHaveAccountEn") ?? "",
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page config." };

  const d = parsed.data;
  try {
    await prisma.registrationPageConfig.upsert({
      where: { id: "default" },
      update: { ...d },
      create: { id: "default", ...d },
    });
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "REGISTRATION_PAGE_CONFIG_UPDATED",
      target: "registrationPageConfig:default",
      payload: { pageTitleEn: d.pageTitleEn, pageTitleAr: d.pageTitleAr },
    });
    revalidateRegistration();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "registration:page-config-update-failed");
    return { ok: false, error: "Failed to save page config." };
  }
}

// ---------- Field config ----------

const fieldSchema = z.object({
  fieldKey: z.string().trim().regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers or underscores").min(2).max(40),
  labelAr: z.string().trim().min(1).max(80),
  labelEn: z.string().trim().min(1).max(80),
  placeholderAr: z.string().trim().max(120).optional().or(z.literal("")),
  placeholderEn: z.string().trim().max(120).optional().or(z.literal("")),
  helpTextAr: z.string().trim().max(300).optional().or(z.literal("")),
  helpTextEn: z.string().trim().max(300).optional().or(z.literal("")),
  tooltipAr: z.string().trim().max(300).optional().or(z.literal("")),
  tooltipEn: z.string().trim().max(300).optional().or(z.literal("")),
  errorRequiredAr: z.string().trim().max(300).optional().or(z.literal("")),
  errorRequiredEn: z.string().trim().max(300).optional().or(z.literal("")),
  errorInvalidAr: z.string().trim().max(300).optional().or(z.literal("")),
  errorInvalidEn: z.string().trim().max(300).optional().or(z.literal("")),
  validationRegex: z.string().trim().max(200).optional().or(z.literal("")),
  minLength: z.coerce.number().int().min(0).max(999).optional().or(z.literal("")),
  maxLength: z.coerce.number().int().min(0).max(999).optional().or(z.literal("")),
  allowNumbers: z.boolean().optional(),
  allowSpecialChars: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isActive: z.boolean().optional(),
  order: z.coerce.number().int().min(0).max(999),
});

const fieldKeySchema = z.object({
  fieldKey: z.string().trim().regex(/^[a-z0-9_]+$/, "Invalid field key.").min(2).max(40),
});

export async function createRegistrationField(formData: FormData): Promise<RegistrationConfigResult> {
  const actor = await requirePermission("FIELD_CREATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = fieldSchema.safeParse({
    fieldKey: formData.get("fieldKey"),
    labelAr: formData.get("labelAr"),
    labelEn: formData.get("labelEn"),
    placeholderAr: formData.get("placeholderAr") ?? "",
    placeholderEn: formData.get("placeholderEn") ?? "",
    helpTextAr: formData.get("helpTextAr") ?? "",
    helpTextEn: formData.get("helpTextEn") ?? "",
    tooltipAr: formData.get("tooltipAr") ?? "",
    tooltipEn: formData.get("tooltipEn") ?? "",
    errorRequiredAr: formData.get("errorRequiredAr") ?? "",
    errorRequiredEn: formData.get("errorRequiredEn") ?? "",
    errorInvalidAr: formData.get("errorInvalidAr") ?? "",
    errorInvalidEn: formData.get("errorInvalidEn") ?? "",
    validationRegex: formData.get("validationRegex") ?? "",
    minLength: formData.get("minLength") ?? "",
    maxLength: formData.get("maxLength") ?? "",
    allowNumbers: formData.get("allowNumbers") === "false" ? false : true,
    allowSpecialChars: formData.get("allowSpecialChars") === "false" ? false : true,
    isRequired: formData.get("isRequired") === "true" || formData.get("isRequired") === null,
    isVisible: formData.get("isVisible") === "true" || formData.get("isVisible") === null,
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid field." };

  const d = parsed.data;
  try {
    await prisma.registrationFieldConfig.create({
      data: {
        fieldKey: d.fieldKey,
        labelAr: d.labelAr,
        labelEn: d.labelEn,
        placeholderAr: d.placeholderAr || null,
        placeholderEn: d.placeholderEn || null,
        helpTextAr: d.helpTextAr || null,
        helpTextEn: d.helpTextEn || null,
        tooltipAr: d.tooltipAr || null,
        tooltipEn: d.tooltipEn || null,
        errorRequiredAr: d.errorRequiredAr || null,
        errorRequiredEn: d.errorRequiredEn || null,
        errorInvalidAr: d.errorInvalidAr || null,
        errorInvalidEn: d.errorInvalidEn || null,
        validationRegex: d.validationRegex || null,
        minLength: d.minLength === "" ? null : d.minLength,
        maxLength: d.maxLength === "" ? null : d.maxLength,
        allowNumbers: d.allowNumbers ?? true,
        allowSpecialChars: d.allowSpecialChars ?? true,
        isRequired: d.isRequired ?? true,
        isVisible: d.isVisible ?? true,
        isActive: d.isActive ?? true,
        order: d.order,
      },
    });
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "REGISTRATION_FIELD_CREATED",
      target: `registrationField:${d.fieldKey}`,
      payload: { fieldKey: d.fieldKey, order: d.order },
    });
    revalidateRegistration();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A field with this key already exists." };
    logger.warn({ err: (err as Error).message }, "registration:field-create-failed");
    return { ok: false, error: "Failed to create field." };
  }
}

export async function updateRegistrationField(formData: FormData): Promise<RegistrationConfigResult> {
  const actor = await requirePermission("FIELD_UPDATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const fieldKey = String(formData.get("fieldKey") ?? "");
  const parsed = fieldSchema.safeParse({
    fieldKey,
    labelAr: formData.get("labelAr"),
    labelEn: formData.get("labelEn"),
    placeholderAr: formData.get("placeholderAr") ?? "",
    placeholderEn: formData.get("placeholderEn") ?? "",
    helpTextAr: formData.get("helpTextAr") ?? "",
    helpTextEn: formData.get("helpTextEn") ?? "",
    tooltipAr: formData.get("tooltipAr") ?? "",
    tooltipEn: formData.get("tooltipEn") ?? "",
    errorRequiredAr: formData.get("errorRequiredAr") ?? "",
    errorRequiredEn: formData.get("errorRequiredEn") ?? "",
    errorInvalidAr: formData.get("errorInvalidAr") ?? "",
    errorInvalidEn: formData.get("errorInvalidEn") ?? "",
    validationRegex: formData.get("validationRegex") ?? "",
    minLength: formData.get("minLength") ?? "",
    maxLength: formData.get("maxLength") ?? "",
    allowNumbers: formData.get("allowNumbers") === "false" ? false : true,
    allowSpecialChars: formData.get("allowSpecialChars") === "false" ? false : true,
    isRequired: formData.get("isRequired") === "true" || formData.get("isRequired") === null,
    isVisible: formData.get("isVisible") === "true" || formData.get("isVisible") === null,
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    order: formData.get("order") ?? 0,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid field." };

  const existing = await prisma.registrationFieldConfig.findUnique({ where: { fieldKey } });
  if (!existing) return { ok: false, error: "Field not found." };

  const d = parsed.data;
  try {
    await prisma.registrationFieldConfig.update({
      where: { fieldKey },
      data: {
        labelAr: d.labelAr,
        labelEn: d.labelEn,
        placeholderAr: d.placeholderAr || null,
        placeholderEn: d.placeholderEn || null,
        helpTextAr: d.helpTextAr || null,
        helpTextEn: d.helpTextEn || null,
        tooltipAr: d.tooltipAr || null,
        tooltipEn: d.tooltipEn || null,
        errorRequiredAr: d.errorRequiredAr || null,
        errorRequiredEn: d.errorRequiredEn || null,
        errorInvalidAr: d.errorInvalidAr || null,
        errorInvalidEn: d.errorInvalidEn || null,
        validationRegex: d.validationRegex || null,
        minLength: d.minLength === "" ? null : d.minLength,
        maxLength: d.maxLength === "" ? null : d.maxLength,
        allowNumbers: d.allowNumbers ?? true,
        allowSpecialChars: d.allowSpecialChars ?? true,
        isRequired: d.isRequired ?? true,
        isVisible: d.isVisible ?? true,
        isActive: d.isActive ?? true,
        order: d.order,
      },
    });
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "REGISTRATION_FIELD_UPDATED",
      target: `registrationField:${fieldKey}`,
      payload: { fieldKey, order: d.order },
    });
    revalidateRegistration();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "registration:field-update-failed");
    return { ok: false, error: "Failed to update field." };
  }
}

export async function deleteRegistrationField(formData: FormData): Promise<RegistrationConfigResult> {
  const actor = await requirePermission("FIELD_DELETE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = fieldKeySchema.safeParse({ fieldKey: formData.get("fieldKey") });
  if (!parsed.success) return { ok: false, error: "Invalid field key." };

  const fieldKey = parsed.data.fieldKey;
  const existing = await prisma.registrationFieldConfig.findUnique({ where: { fieldKey } });
  if (!existing) return { ok: false, error: "Field not found." };

  try {
    await prisma.registrationFieldConfig.delete({ where: { fieldKey } });
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "REGISTRATION_FIELD_DELETED",
      target: `registrationField:${fieldKey}`,
      payload: { fieldKey },
    });
    revalidateRegistration();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "registration:field-delete-failed");
    return { ok: false, error: "Failed to delete field." };
  }
}

// ---------- Toggles (each: await + revalidatePath) ----------

const toggleSchema = z.object({
  fieldKey: z.string().trim().min(2).max(40),
  value: z.coerce.boolean(),
});

async function toggleField(permission: RegistrationPermission, action: string, formData: FormData): Promise<RegistrationConfigResult> {
  const actor = await requirePermission(permission);
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = toggleSchema.safeParse({ fieldKey: formData.get("fieldKey"), value: formData.get("value") });
  if (!parsed.success) return { ok: false, error: "Invalid toggle payload." };

  const fieldKey = parsed.data.fieldKey;
  const value = parsed.data.value;

  const existing = await prisma.registrationFieldConfig.findUnique({ where: { fieldKey } });
  if (!existing) return { ok: false, error: "Field not found." };

  const data = (() => {
    switch (permission) {
      case "FIELD_TOGGLE_VISIBLE":
        return { isVisible: value };
      case "FIELD_TOGGLE_REQUIRED":
        return { isRequired: value };
      default:
        return { isActive: value };
    }
  })();

  try {
    await prisma.registrationFieldConfig.update({ where: { fieldKey }, data });
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action,
      target: `registrationField:${fieldKey}`,
      payload: { fieldKey, value },
    });
    revalidateRegistration();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "registration:field-toggle-failed");
    return { ok: false, error: "Failed to update field." };
  }
}

export async function toggleRegistrationFieldVisible(formData: FormData): Promise<RegistrationConfigResult> {
  return toggleField("FIELD_TOGGLE_VISIBLE", "REGISTRATION_FIELD_TOGGLED_VISIBLE", formData);
}

export async function toggleRegistrationFieldRequired(formData: FormData): Promise<RegistrationConfigResult> {
  return toggleField("FIELD_TOGGLE_REQUIRED", "REGISTRATION_FIELD_TOGGLED_REQUIRED", formData);
}

export async function toggleRegistrationFieldActive(formData: FormData): Promise<RegistrationConfigResult> {
  return toggleField("FIELD_TOGGLE_ACTIVE", "REGISTRATION_FIELD_TOGGLED_ACTIVE", formData);
}

// ---------- Reorder ----------

const reorderSchema = z.object({
  fieldKeys: z.array(z.string().trim().min(2).max(40)).min(1),
});

export async function reorderRegistrationFields(formData: FormData): Promise<RegistrationConfigResult> {
  const actor = await requirePermission("FIELD_REORDER");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("fieldKeys") ?? "[]"));
  } catch {
    return { ok: false, error: "Invalid reorder payload." };
  }
  const parsed = reorderSchema.safeParse({ fieldKeys: raw });
  if (!parsed.success) return { ok: false, error: "Invalid reorder payload." };

  const fieldKeys = parsed.data.fieldKeys;
  try {
    await prisma.$transaction(
      fieldKeys.map((fieldKey, index) =>
        prisma.registrationFieldConfig.updateMany({
          where: { fieldKey },
          data: { order: index + 1 },
        })
      )
    );
    await audit({
      actorId: actor.actorId,
      actorRole: actor.actorRole,
      action: "REGISTRATION_FIELDS_REORDERED",
      target: "registrationFieldConfig",
      payload: { fieldKeys },
    });
    revalidateRegistration();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "registration:field-reorder-failed");
    return { ok: false, error: "Failed to reorder fields." };
  }
}
