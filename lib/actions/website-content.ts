"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/log";

export type WebsiteContentResult = { ok: boolean; error?: string };

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

// ---------- Partners ----------

export async function getPartners() {
  return prisma.partner.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function upsertPartner(formData: FormData): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = formData.get("id") as string | null;
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    isActive: formData.get("isActive") !== "false",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  if (!data.name) return { ok: false, error: "Partner name is required." };

  try {
    if (id) {
      await prisma.partner.update({ where: { id }, data });
    } else {
      const maxOrder = await prisma.partner.aggregate({ _max: { sortOrder: true } });
      await prisma.partner.create({ data: { ...data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 } });
    }
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "partner:save-failed");
    return { ok: false, error: "Failed to save partner." };
  }
}

export async function deletePartner(id: string): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  try {
    await prisma.partner.delete({ where: { id } });
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "partner:delete-failed");
    return { ok: false, error: "Failed to delete partner." };
  }
}

export async function reorderPartners(ids: string[]): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  try {
    await prisma.$transaction(ids.map((id, i) => prisma.partner.update({ where: { id }, data: { sortOrder: i } })));
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "partner:reorder-failed");
    return { ok: false, error: "Failed to reorder." };
  }
}

// ---------- Testimonials ----------

export async function getTestimonials() {
  return prisma.testimonial.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function upsertTestimonial(formData: FormData): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = formData.get("id") as string | null;
  const data = {
    name: String(formData.get("name") ?? "").trim(),
    company: String(formData.get("company") ?? "").trim() || null,
    content: String(formData.get("content") ?? "").trim(),
    rating: Math.min(5, Math.max(1, Number(formData.get("rating") ?? 5))),
    isActive: formData.get("isActive") !== "false",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  if (!data.name || !data.content) return { ok: false, error: "Name and content are required." };

  try {
    if (id) {
      await prisma.testimonial.update({ where: { id }, data });
    } else {
      const maxOrder = await prisma.testimonial.aggregate({ _max: { sortOrder: true } });
      await prisma.testimonial.create({ data: { ...data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 } });
    }
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "testimonial:save-failed");
    return { ok: false, error: "Failed to save testimonial." };
  }
}

export async function deleteTestimonial(id: string): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  try {
    await prisma.testimonial.delete({ where: { id } });
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "testimonial:delete-failed");
    return { ok: false, error: "Failed to delete testimonial." };
  }
}

// ---------- FAQ ----------

export async function getFaqs() {
  return prisma.faq.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function upsertFaq(formData: FormData): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = formData.get("id") as string | null;
  const data = {
    question: String(formData.get("question") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
    isActive: formData.get("isActive") !== "false",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  if (!data.question || !data.answer) return { ok: false, error: "Question and answer are required." };

  try {
    if (id) {
      await prisma.faq.update({ where: { id }, data });
    } else {
      const maxOrder = await prisma.faq.aggregate({ _max: { sortOrder: true } });
      await prisma.faq.create({ data: { ...data, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 } });
    }
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "faq:save-failed");
    return { ok: false, error: "Failed to save FAQ." };
  }
}

export async function deleteFaq(id: string): Promise<WebsiteContentResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  try {
    await prisma.faq.delete({ where: { id } });
    revalidatePath("/admin/website-builder");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "faq:delete-failed");
    return { ok: false, error: "Failed to delete FAQ." };
  }
}
