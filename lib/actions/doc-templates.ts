"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/log";

export type DocTemplateActionResult = { ok: boolean; error?: string };

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prisma as any;

export async function getDocumentTemplates() {
  try {
    if (!p?.documentTemplate) {
      console.error("prisma.documentTemplate not found - run prisma generate");
      return [];
    }
    return await p.documentTemplate.findMany({ orderBy: { type: "asc" } });
  } catch (err) {
    console.error("getDocumentTemplates error:", err);
    return [];
  }
}

export async function getDocumentTemplate(type: string) {
  try {
    if (!p?.documentTemplate) return null;
    return await p.documentTemplate.findUnique({ where: { type } });
  } catch (err) {
    console.error("getDocumentTemplate error:", err);
    return null;
  }
}

const TEMPLATE_TYPES = ["QUOTE", "INVOICE", "BOOKING_CONFIRMATION", "BILL_OF_LADING", "SHIPMENT_ORDER", "DELIVERY_ORDER"] as const;

export async function ensureDefaultTemplates(): Promise<DocTemplateActionResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  if (!p?.documentTemplate) {
    console.error("prisma.documentTemplate not found - run prisma generate");
    return { ok: false, error: "Prisma client not ready. Run prisma generate." };
  }

  try {
    for (const type of TEMPLATE_TYPES) {
      const exists = await p.documentTemplate.findUnique({ where: { type } });
      if (!exists) {
        await p.documentTemplate.create({
          data: {
            type,
            name: type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()),
            headerSettings: JSON.stringify({
              layout: "logo_left",
              showLogo: true,
              showCompanyName: true,
              showAddress: true,
              showPhone: true,
              showEmail: false,
              showWebsite: false,
            }),
            footerSettings: JSON.stringify({
              showTerms: type === "QUOTE",
              showBankInfo: type === "INVOICE",
              showSignature: true,
              showPageNumber: true,
              customText: "",
            }),
          },
        });
      }
    }
    revalidatePath("/admin/document-builder");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "doc-templates:ensure-defaults-failed");
    return { ok: false, error: "Failed to create default templates." };
  }
}

export async function upsertDocumentTemplate(type: string, formData: FormData): Promise<DocTemplateActionResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  if (!p?.documentTemplate) {
    console.error("prisma.documentTemplate not found - run prisma generate");
    return { ok: false, error: "Prisma client not ready. Run prisma generate." };
  }

  const headerSettingsRaw = formData.get("headerSettings");
  const footerSettingsRaw = formData.get("footerSettings");
  const bodySettingsRaw = formData.get("bodySettings");

  let headerSettings: Record<string, unknown> = {};
  let footerSettings: Record<string, unknown> = {};
  let bodySettings: Record<string, unknown> | null = null;

  try { if (headerSettingsRaw) headerSettings = JSON.parse(String(headerSettingsRaw)); } catch { /* ignore */ }
  try { if (footerSettingsRaw) footerSettings = JSON.parse(String(footerSettingsRaw)); } catch { /* ignore */ }
  try { if (bodySettingsRaw) bodySettings = JSON.parse(String(bodySettingsRaw)); } catch { /* ignore */ }

  const data = {
    name: String(formData.get("name") ?? type.replace(/_/g, " ")),
    nameAr: formData.get("nameAr") ? String(formData.get("nameAr")).trim() || null : null,
    isActive: formData.get("isActive") !== "false",
    headerSettings: JSON.stringify(headerSettings),
    footerSettings: JSON.stringify(footerSettings),
    bodySettings: bodySettings ? JSON.stringify(bodySettings) : undefined,
  };

  try {
    await p.documentTemplate.upsert({
      where: { type },
      create: { type, ...data },
      update: data,
    });
    revalidatePath("/admin/document-builder");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "doc-template:save-failed");
    return { ok: false, error: "Failed to save template." };
  }
}
