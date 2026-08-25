"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/log";

export type CompanyInfoActionResult = { ok: boolean; error?: string };

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const p = prisma as any;

export async function getCompanyInfo() {
  try {
    if (!p?.companyInfo) {
      console.error("prisma.companyInfo not found - run prisma generate");
      return null;
    }
    const info = await p.companyInfo.findFirst({ orderBy: { createdAt: "desc" } });
    return info ?? null;
  } catch (err) {
    console.error("getCompanyInfo error:", err);
    return null;
  }
}

const DEFAULT_COMPANY_INFO = {
  name: "ALOLA LOGISTICS",
  nameAr: "ألولا للخدمات اللوجستية",
  logoUrl: null,
  logoForPdfUrl: null,
  address: null,
  addressAr: null,
  city: null,
  country: null,
  phone: null,
  phone2: null,
  email: null,
  website: null,
  taxNumber: null,
  commercialReg: null,
  headerShowLogo: true,
  headerShowCompanyName: true,
  headerShowAddress: true,
  headerShowPhone: true,
  headerShowEmail: true,
  headerShowWebsite: false,
  footerShowTerms: true,
  footerShowBankInfo: false,
  footerShowSignature: true,
  footerShowPageNumber: true,
  footerTermsText: null,
  footerTermsTextAr: null,
  bankInfo: null,
} as const;

export async function getCompanyInfoSafe() {
  const info = await getCompanyInfo();
  if (!info) return DEFAULT_COMPANY_INFO;
  return info;
}

export async function upsertCompanyInfo(formData: FormData): Promise<CompanyInfoActionResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  if (!p?.companyInfo) {
    console.error("prisma.companyInfo not found - run prisma generate");
    return { ok: false, error: "Prisma client not ready. Run prisma generate." };
  }

  const data: Record<string, unknown> = {};
  const stringFields = [
    "name", "nameAr", "logoUrl", "logoForPdfUrl", "address", "addressAr",
    "city", "country", "phone", "phone2", "email", "website",
    "taxNumber", "commercialReg", "footerTermsText", "footerTermsTextAr",
  ];
  for (const f of stringFields) {
    const v = formData.get(f);
    data[f] = v != null && String(v).trim() !== "" ? String(v).trim() : null;
  }
  const boolFields = [
    "headerShowLogo", "headerShowCompanyName", "headerShowAddress",
    "headerShowPhone", "headerShowEmail", "headerShowWebsite",
    "footerShowTerms", "footerShowBankInfo", "footerShowSignature", "footerShowPageNumber",
  ];
  for (const f of boolFields) {
    data[f] = formData.get(f) === "true";
  }
  const bankInfoRaw = formData.get("bankInfo");
  if (bankInfoRaw) {
    try { data.bankInfo = JSON.parse(String(bankInfoRaw)); } catch { /* ignore */ }
  }

  try {
    const existing = await p.companyInfo.findFirst();
    if (existing) {
      await p.companyInfo.update({ where: { id: existing.id }, data });
    } else {
      await p.companyInfo.create({ data });
    }
    revalidatePath("/admin/document-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "company-info:save-failed");
    return { ok: false, error: "Failed to save company info." };
  }
}
