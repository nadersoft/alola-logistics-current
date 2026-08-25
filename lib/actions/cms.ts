"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, logger } from "@/lib/log";
import { auth } from "@/auth";

export type CmsActionResult = { ok: boolean; error?: string };

// ---------- RBAC permissions (16) ----------

export type CmsPermission =
  | "CMS_VIEW"
  | "CMS_PAGE_CREATE"
  | "CMS_PAGE_UPDATE"
  | "CMS_PAGE_DELETE"
  | "CMS_PAGE_TOGGLE"
  | "CMS_SECTION_CREATE"
  | "CMS_SECTION_UPDATE"
  | "CMS_SECTION_DELETE"
  | "CMS_SECTION_TOGGLE"
  | "CMS_SECTION_REORDER"
  | "CMS_ITEM_CREATE"
  | "CMS_ITEM_UPDATE"
  | "CMS_ITEM_DELETE"
  | "CMS_ITEM_TOGGLE"
  | "CMS_ITEM_REORDER"
  | "CMS_ITEM_DUPLICATE"
  | "CMS_ITEM_FEATURED";

const PERMISSION_ROLES: Record<CmsPermission, string[]> = {
  CMS_VIEW: ["SUPER_ADMIN", "MANAGER", "SUPPORT"],
  CMS_PAGE_CREATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_PAGE_UPDATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_PAGE_DELETE: ["SUPER_ADMIN"],
  CMS_PAGE_TOGGLE: ["SUPER_ADMIN", "MANAGER"],
  CMS_SECTION_CREATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_SECTION_UPDATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_SECTION_DELETE: ["SUPER_ADMIN"],
  CMS_SECTION_TOGGLE: ["SUPER_ADMIN", "MANAGER"],
  CMS_SECTION_REORDER: ["SUPER_ADMIN", "MANAGER"],
  CMS_ITEM_CREATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_ITEM_UPDATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_ITEM_DELETE: ["SUPER_ADMIN"],
  CMS_ITEM_TOGGLE: ["SUPER_ADMIN", "MANAGER"],
  CMS_ITEM_REORDER: ["SUPER_ADMIN", "MANAGER"],
  CMS_ITEM_DUPLICATE: ["SUPER_ADMIN", "MANAGER"],
  CMS_ITEM_FEATURED: ["SUPER_ADMIN", "MANAGER"],
};

async function requirePermission(permission: CmsPermission): Promise<{ actorId: string; actorRole: string } | null> {
  const session = await auth();
  const role = session?.user?.role ?? null;
  if (!session?.user || !role || !PERMISSION_ROLES[permission].includes(role)) return null;
  return { actorId: session.user.id ?? "unknown", actorRole: role };
}

function revalidateCms() {
  revalidatePath("/admin/cms");
  revalidatePath("/", "layout");
  revalidatePath("/#services");
  revalidatePath("/#whyus");
  revalidatePath("/#tracking");
  revalidatePath("/#contact");
}

// ---------- Reads (server components + admin UI) ----------

export type CmsPageRow = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  isActive: boolean;
  sectionCount: number;
};

export async function getCmsPages(): Promise<CmsPageRow[]> {
  const pages = await prisma.cmsPage.findMany({
    orderBy: [{ slug: "asc" }],
    select: {
      id: true,
      slug: true,
      titleAr: true,
      titleEn: true,
      isActive: true,
      _count: { select: { sections: true } },
    },
  });
  return pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    titleAr: p.titleAr,
    titleEn: p.titleEn,
    isActive: p.isActive,
    sectionCount: p._count.sections,
  }));
}

export type CmsItemRow = {
  id: string;
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  shortLabelAr: string | null;
  shortLabelEn: string | null;
  descriptionAr: string | null;
  descriptionEn: string | null;
  value: string | null;
  subValue: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  isActive: boolean;
  isVisible: boolean;
  isFeatured: boolean;
  order: number;
};

export type CmsSectionRow = {
  id: string;
  key: string;
  type: string;
  badgeAr: string | null;
  badgeEn: string | null;
  titleAr: string | null;
  titleEn: string | null;
  subtitleAr: string | null;
  subtitleEn: string | null;
  contentAr: string | null;
  contentEn: string | null;
  imageUrl: string | null;
  isActive: boolean;
  isVisible: boolean;
  order: number;
  items: CmsItemRow[];
};

export type CmsPageDetail = {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  isActive: boolean;
  sections: CmsSectionRow[];
};

export async function getPageBySlug(slug: string): Promise<CmsPageDetail | null> {
  const page = await prisma.cmsPage.findUnique({
    where: { slug },
    include: {
      sections: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { items: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
      },
    },
  });
  if (!page) return null;
  return {
    id: page.id,
    slug: page.slug,
    titleAr: page.titleAr,
    titleEn: page.titleEn,
    isActive: page.isActive,
    sections: page.sections.map((s) => ({
      id: s.id,
      key: s.key,
      type: s.type,
      badgeAr: s.badgeAr,
      badgeEn: s.badgeEn,
      titleAr: s.titleAr,
      titleEn: s.titleEn,
      subtitleAr: s.subtitleAr,
      subtitleEn: s.subtitleEn,
      contentAr: s.contentAr,
      contentEn: s.contentEn,
      imageUrl: s.imageUrl,
      isActive: s.isActive,
      isVisible: s.isVisible,
      order: s.order,
      items: s.items.map((i) => ({
        id: i.id,
        slug: i.slug,
        icon: i.icon,
        titleAr: i.titleAr,
        titleEn: i.titleEn,
        shortLabelAr: i.shortLabelAr,
        shortLabelEn: i.shortLabelEn,
        descriptionAr: i.descriptionAr,
        descriptionEn: i.descriptionEn,
        value: i.value,
        subValue: i.subValue,
        imageUrl: i.imageUrl,
        linkUrl: i.linkUrl,
        isActive: i.isActive,
        isVisible: i.isVisible,
        isFeatured: i.isFeatured,
        order: i.order,
      })),
    })),
  };
}

export type CmsSectionWithItems = CmsSectionRow & { pageSlug: string };

/**
 * Public read for the marketing site: finds the first active+visible section
 * matching `key` (on an active page) and returns it with its active items.
 */
export async function getSectionWithItems(key: string): Promise<CmsSectionWithItems | null> {
  const section = await prisma.cmsSection.findFirst({
    where: { key, isActive: true, isVisible: true, page: { isActive: true } },
    orderBy: [{ createdAt: "asc" }],
    include: {
      page: { select: { slug: true } },
      items: {
        where: { isActive: true, isVisible: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!section) return null;
  return {
    id: section.id,
    key: section.key,
    type: section.type,
    badgeAr: section.badgeAr,
    badgeEn: section.badgeEn,
    titleAr: section.titleAr,
    titleEn: section.titleEn,
    subtitleAr: section.subtitleAr,
    subtitleEn: section.subtitleEn,
    contentAr: section.contentAr,
    contentEn: section.contentEn,
    imageUrl: section.imageUrl,
    isActive: section.isActive,
    isVisible: section.isVisible,
    order: section.order,
    pageSlug: section.page.slug,
    items: section.items.map((i) => ({
      id: i.id,
      slug: i.slug,
      icon: i.icon,
      titleAr: i.titleAr,
      titleEn: i.titleEn,
      shortLabelAr: i.shortLabelAr,
      shortLabelEn: i.shortLabelEn,
      descriptionAr: i.descriptionAr,
      descriptionEn: i.descriptionEn,
      value: i.value,
      subValue: i.subValue,
      imageUrl: i.imageUrl,
      linkUrl: i.linkUrl,
      isActive: i.isActive,
      isVisible: i.isVisible,
      isFeatured: i.isFeatured,
      order: i.order,
    })),
  };
}

// ---------- Pages ----------

const pageSchema = z.object({
  id: z.string().trim().min(1).optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers or hyphens").min(2).max(80),
  titleAr: z.string().trim().min(1).max(120),
  titleEn: z.string().trim().min(1).max(120),
  isActive: z.boolean().optional(),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(40) });

const toggleSchema = z.object({
  id: z.string().trim().min(1).max(40),
  value: z.coerce.boolean(),
});

export async function createCmsPage(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_PAGE_CREATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = pageSchema.safeParse({
    slug: formData.get("slug"),
    titleAr: formData.get("titleAr"),
    titleEn: formData.get("titleEn"),
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page." };

  const d = parsed.data;
  try {
    await prisma.cmsPage.create({
      data: { slug: d.slug, titleAr: d.titleAr, titleEn: d.titleEn, isActive: d.isActive ?? true },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_PAGE_CREATED", target: `cmsPage:${d.slug}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A page with this slug already exists." };
    logger.warn({ err: (err as Error).message }, "cms:page-create-failed");
    return { ok: false, error: "Failed to create page." };
  }
}

export async function updateCmsPage(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_PAGE_UPDATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = pageSchema.safeParse({
    id,
    slug: formData.get("slug"),
    titleAr: formData.get("titleAr"),
    titleEn: formData.get("titleEn"),
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid page." };

  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found." };

  const d = parsed.data;
  try {
    await prisma.cmsPage.update({
      where: { id },
      data: { slug: d.slug, titleAr: d.titleAr, titleEn: d.titleEn, isActive: d.isActive ?? true },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_PAGE_UPDATED", target: `cmsPage:${d.slug}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A page with this slug already exists." };
    logger.warn({ err: (err as Error).message }, "cms:page-update-failed");
    return { ok: false, error: "Failed to update page." };
  }
}

export async function deleteCmsPage(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_PAGE_DELETE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid page id." };

  const id = parsed.data.id;
  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found." };

  try {
    await prisma.cmsPage.delete({ where: { id } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_PAGE_DELETED", target: `cmsPage:${existing.slug}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:page-delete-failed");
    return { ok: false, error: "Failed to delete page." };
  }
}

export async function toggleCmsPageActive(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_PAGE_TOGGLE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = toggleSchema.safeParse({ id: formData.get("id"), value: formData.get("value") });
  if (!parsed.success) return { ok: false, error: "Invalid toggle payload." };

  const { id, value } = parsed.data;
  const existing = await prisma.cmsPage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Page not found." };

  try {
    await prisma.cmsPage.update({ where: { id }, data: { isActive: value } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_PAGE_TOGGLED_ACTIVE", target: `cmsPage:${existing.slug}`, payload: { value } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:page-toggle-failed");
    return { ok: false, error: "Failed to update page." };
  }
}

// ---------- Sections ----------

const sectionSchema = z.object({
  id: z.string().trim().min(1).optional(),
  pageId: z.string().trim().min(1),
  key: z.string().trim().regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers or underscores").min(2).max(60),
  type: z.string().trim().min(1).max(30),
  badgeAr: z.string().trim().max(120).optional().or(z.literal("")),
  badgeEn: z.string().trim().max(120).optional().or(z.literal("")),
  titleAr: z.string().trim().max(200).optional().or(z.literal("")),
  titleEn: z.string().trim().max(200).optional().or(z.literal("")),
  subtitleAr: z.string().trim().max(1000).optional().or(z.literal("")),
  subtitleEn: z.string().trim().max(1000).optional().or(z.literal("")),
  contentAr: z.string().trim().max(4000).optional().or(z.literal("")),
  contentEn: z.string().trim().max(4000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

const sectionIdSchema = z.object({ id: z.string().trim().min(1).max(40) });

export async function createCmsSection(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_SECTION_CREATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = sectionSchema.safeParse({
    pageId: formData.get("pageId"),
    key: formData.get("key"),
    type: formData.get("type"),
    badgeAr: formData.get("badgeAr") ?? "",
    badgeEn: formData.get("badgeEn") ?? "",
    titleAr: formData.get("titleAr") ?? "",
    titleEn: formData.get("titleEn") ?? "",
    subtitleAr: formData.get("subtitleAr") ?? "",
    subtitleEn: formData.get("subtitleEn") ?? "",
    contentAr: formData.get("contentAr") ?? "",
    contentEn: formData.get("contentEn") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    isVisible: formData.get("isVisible") === "true" || formData.get("isVisible") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid section." };

  const d = parsed.data;
  const page = await prisma.cmsPage.findUnique({ where: { id: d.pageId } });
  if (!page) return { ok: false, error: "Page not found." };

  try {
    const maxOrder = await prisma.cmsSection.aggregate({ where: { pageId: d.pageId }, _max: { order: true } });
    await prisma.cmsSection.create({
      data: {
        pageId: d.pageId,
        key: d.key,
        type: d.type,
        order: (maxOrder._max.order ?? 0) + 1,
        badgeAr: d.badgeAr || null,
        badgeEn: d.badgeEn || null,
        titleAr: d.titleAr || null,
        titleEn: d.titleEn || null,
        subtitleAr: d.subtitleAr || null,
        subtitleEn: d.subtitleEn || null,
        contentAr: d.contentAr || null,
        contentEn: d.contentEn || null,
        imageUrl: d.imageUrl || null,
        isActive: d.isActive ?? true,
        isVisible: d.isVisible ?? true,
      },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_SECTION_CREATED", target: `cmsPage:${page.slug}:section:${d.key}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A section with this key already exists on this page." };
    logger.warn({ err: (err as Error).message }, "cms:section-create-failed");
    return { ok: false, error: "Failed to create section." };
  }
}

export async function updateCmsSection(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_SECTION_UPDATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = sectionSchema.safeParse({
    id,
    pageId: formData.get("pageId"),
    key: formData.get("key"),
    type: formData.get("type"),
    badgeAr: formData.get("badgeAr") ?? "",
    badgeEn: formData.get("badgeEn") ?? "",
    titleAr: formData.get("titleAr") ?? "",
    titleEn: formData.get("titleEn") ?? "",
    subtitleAr: formData.get("subtitleAr") ?? "",
    subtitleEn: formData.get("subtitleEn") ?? "",
    contentAr: formData.get("contentAr") ?? "",
    contentEn: formData.get("contentEn") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    isVisible: formData.get("isVisible") === "true" || formData.get("isVisible") === null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid section." };

  const existing = await prisma.cmsSection.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Section not found." };

  const d = parsed.data;
  try {
    await prisma.cmsSection.update({
      where: { id },
      data: {
        key: d.key,
        type: d.type,
        badgeAr: d.badgeAr || null,
        badgeEn: d.badgeEn || null,
        titleAr: d.titleAr || null,
        titleEn: d.titleEn || null,
        subtitleAr: d.subtitleAr || null,
        subtitleEn: d.subtitleEn || null,
        contentAr: d.contentAr || null,
        contentEn: d.contentEn || null,
        imageUrl: d.imageUrl || null,
        isActive: d.isActive ?? true,
        isVisible: d.isVisible ?? true,
      },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_SECTION_UPDATED", target: `cmsSection:${existing.key}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A section with this key already exists on this page." };
    logger.warn({ err: (err as Error).message }, "cms:section-update-failed");
    return { ok: false, error: "Failed to update section." };
  }
}

export async function deleteCmsSection(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_SECTION_DELETE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = sectionIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid section id." };

  const id = parsed.data.id;
  const existing = await prisma.cmsSection.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Section not found." };

  try {
    await prisma.cmsSection.delete({ where: { id } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_SECTION_DELETED", target: `cmsSection:${existing.key}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:section-delete-failed");
    return { ok: false, error: "Failed to delete section." };
  }
}

async function toggleSection(permission: CmsPermission, action: string, formData: FormData, field: "isActive" | "isVisible"): Promise<CmsActionResult> {
  const actor = await requirePermission(permission);
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = toggleSchema.safeParse({ id: formData.get("id"), value: formData.get("value") });
  if (!parsed.success) return { ok: false, error: "Invalid toggle payload." };

  const { id, value } = parsed.data;
  const existing = await prisma.cmsSection.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Section not found." };

  try {
    await prisma.cmsSection.update({ where: { id }, data: { [field]: value } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action, target: `cmsSection:${existing.key}`, payload: { value } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:section-toggle-failed");
    return { ok: false, error: "Failed to update section." };
  }
}

export async function toggleCmsSectionActive(formData: FormData): Promise<CmsActionResult> {
  return toggleSection("CMS_SECTION_TOGGLE", "CMS_SECTION_TOGGLED_ACTIVE", formData, "isActive");
}

export async function toggleCmsSectionVisible(formData: FormData): Promise<CmsActionResult> {
  return toggleSection("CMS_SECTION_TOGGLE", "CMS_SECTION_TOGGLED_VISIBLE", formData, "isVisible");
}

const reorderSectionsSchema = z.object({
  pageId: z.string().trim().min(1),
  sectionIds: z.array(z.string().trim().min(1)).min(1),
});

export async function reorderCmsSections(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_SECTION_REORDER");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { ok: false, error: "Invalid reorder payload." };
  }
  const parsed = reorderSectionsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid reorder payload." };

  const { pageId, sectionIds } = parsed.data;
  try {
    await prisma.$transaction(
      sectionIds.map((sectionId, index) =>
        prisma.cmsSection.updateMany({ where: { id: sectionId, pageId }, data: { order: index + 1 } })
      )
    );
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_SECTIONS_REORDERED", target: `cmsPage:${pageId}`, payload: { sectionIds } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:section-reorder-failed");
    return { ok: false, error: "Failed to reorder sections." };
  }
}

// ---------- Items ----------

const itemSchema = z.object({
  id: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers or hyphens").min(2).max(80),
  icon: z.string().trim().max(40).optional(),
  titleAr: z.string().trim().min(1).max(200),
  titleEn: z.string().trim().min(1).max(200),
  shortLabelAr: z.string().trim().max(200).optional().or(z.literal("")),
  shortLabelEn: z.string().trim().max(200).optional().or(z.literal("")),
  descriptionAr: z.string().trim().max(4000).optional().or(z.literal("")),
  descriptionEn: z.string().trim().max(4000).optional().or(z.literal("")),
  value: z.string().trim().max(120).optional().or(z.literal("")),
  subValue: z.string().trim().max(120).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  linkUrl: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export async function createCmsItem(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_ITEM_CREATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = itemSchema.safeParse({
    sectionId: formData.get("sectionId"),
    slug: formData.get("slug"),
    icon: formData.get("icon") ?? "package",
    titleAr: formData.get("titleAr"),
    titleEn: formData.get("titleEn"),
    shortLabelAr: formData.get("shortLabelAr") ?? "",
    shortLabelEn: formData.get("shortLabelEn") ?? "",
    descriptionAr: formData.get("descriptionAr") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    value: formData.get("value") ?? "",
    subValue: formData.get("subValue") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    linkUrl: formData.get("linkUrl") ?? "",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    isVisible: formData.get("isVisible") === "true" || formData.get("isVisible") === null,
    isFeatured: formData.get("isFeatured") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };

  const d = parsed.data;
  const section = await prisma.cmsSection.findUnique({ where: { id: d.sectionId } });
  if (!section) return { ok: false, error: "Section not found." };

  try {
    const maxOrder = await prisma.cmsItem.aggregate({ where: { sectionId: d.sectionId }, _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? 0) + 1;
    const featured = d.isFeatured === true ? { isFeatured: false } : undefined;
    if (featured) {
      await prisma.$transaction(async (tx) => {
        await tx.cmsItem.updateMany({ where: { sectionId: d.sectionId }, data: { isFeatured: false } });
        await tx.cmsItem.create({
          data: {
            sectionId: d.sectionId,
            slug: d.slug,
            icon: d.icon || "package",
            titleAr: d.titleAr,
            titleEn: d.titleEn,
            shortLabelAr: d.shortLabelAr || null,
            shortLabelEn: d.shortLabelEn || null,
            descriptionAr: d.descriptionAr || null,
            descriptionEn: d.descriptionEn || null,
            value: d.value || null,
            subValue: d.subValue || null,
            imageUrl: d.imageUrl || null,
            linkUrl: d.linkUrl || null,
            isActive: d.isActive ?? true,
            isVisible: d.isVisible ?? true,
            isFeatured: true,
            order: nextOrder,
          },
        });
      });
    } else {
      await prisma.cmsItem.create({
        data: {
          sectionId: d.sectionId,
          slug: d.slug,
          icon: d.icon || "package",
          titleAr: d.titleAr,
          titleEn: d.titleEn,
          shortLabelAr: d.shortLabelAr || null,
          shortLabelEn: d.shortLabelEn || null,
          descriptionAr: d.descriptionAr || null,
          descriptionEn: d.descriptionEn || null,
          value: d.value || null,
          subValue: d.subValue || null,
          imageUrl: d.imageUrl || null,
          linkUrl: d.linkUrl || null,
          isActive: d.isActive ?? true,
          isVisible: d.isVisible ?? true,
          isFeatured: false,
          order: nextOrder,
        },
      });
    }
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_ITEM_CREATED", target: `cmsSection:${section.key}:item:${d.slug}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "An item with this slug already exists in this section." };
    logger.warn({ err: (err as Error).message }, "cms:item-create-failed");
    return { ok: false, error: "Failed to create item." };
  }
}

export async function updateCmsItem(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_ITEM_UPDATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = itemSchema.safeParse({
    id,
    sectionId: formData.get("sectionId"),
    slug: formData.get("slug"),
    icon: formData.get("icon") ?? "package",
    titleAr: formData.get("titleAr"),
    titleEn: formData.get("titleEn"),
    shortLabelAr: formData.get("shortLabelAr") ?? "",
    shortLabelEn: formData.get("shortLabelEn") ?? "",
    descriptionAr: formData.get("descriptionAr") ?? "",
    descriptionEn: formData.get("descriptionEn") ?? "",
    value: formData.get("value") ?? "",
    subValue: formData.get("subValue") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    linkUrl: formData.get("linkUrl") ?? "",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    isVisible: formData.get("isVisible") === "true" || formData.get("isVisible") === null,
    isFeatured: formData.get("isFeatured") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid item." };

  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Item not found." };

  const d = parsed.data;
  try {
    await prisma.cmsItem.update({
      where: { id },
      data: {
        slug: d.slug,
        icon: d.icon || "package",
        titleAr: d.titleAr,
        titleEn: d.titleEn,
        shortLabelAr: d.shortLabelAr || null,
        shortLabelEn: d.shortLabelEn || null,
        descriptionAr: d.descriptionAr || null,
        descriptionEn: d.descriptionEn || null,
        value: d.value || null,
        subValue: d.subValue || null,
        imageUrl: d.imageUrl || null,
        linkUrl: d.linkUrl || null,
        isActive: d.isActive ?? true,
        isVisible: d.isVisible ?? true,
      },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_ITEM_UPDATED", target: `cmsItem:${existing.slug}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "An item with this slug already exists in this section." };
    logger.warn({ err: (err as Error).message }, "cms:item-update-failed");
    return { ok: false, error: "Failed to update item." };
  }
}

export async function deleteCmsItem(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_ITEM_DELETE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid item id." };

  const id = parsed.data.id;
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Item not found." };

  try {
    await prisma.cmsItem.delete({ where: { id } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_ITEM_DELETED", target: `cmsItem:${existing.slug}` });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:item-delete-failed");
    return { ok: false, error: "Failed to delete item." };
  }
}

async function toggleItem(permission: CmsPermission, action: string, formData: FormData, field: "isActive" | "isVisible"): Promise<CmsActionResult> {
  const actor = await requirePermission(permission);
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = toggleSchema.safeParse({ id: formData.get("id"), value: formData.get("value") });
  if (!parsed.success) return { ok: false, error: "Invalid toggle payload." };

  const { id, value } = parsed.data;
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Item not found." };

  try {
    await prisma.cmsItem.update({ where: { id }, data: { [field]: value } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action, target: `cmsItem:${existing.slug}`, payload: { value } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:item-toggle-failed");
    return { ok: false, error: "Failed to update item." };
  }
}

export async function toggleCmsItemActive(formData: FormData): Promise<CmsActionResult> {
  return toggleItem("CMS_ITEM_TOGGLE", "CMS_ITEM_TOGGLED_ACTIVE", formData, "isActive");
}

export async function toggleCmsItemVisible(formData: FormData): Promise<CmsActionResult> {
  return toggleItem("CMS_ITEM_TOGGLE", "CMS_ITEM_TOGGLED_VISIBLE", formData, "isVisible");
}

/** Single featured per section — wrapped in a transaction (unset all, then set one). */
export async function setCmsItemFeatured(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_ITEM_FEATURED");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = toggleSchema.safeParse({ id: formData.get("id"), value: formData.get("value") });
  if (!parsed.success) return { ok: false, error: "Invalid toggle payload." };

  const { id, value } = parsed.data;
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Item not found." };

  try {
    if (value) {
      await prisma.$transaction([
        prisma.cmsItem.updateMany({ where: { sectionId: existing.sectionId }, data: { isFeatured: false } }),
        prisma.cmsItem.update({ where: { id }, data: { isFeatured: true } }),
      ]);
    } else {
      await prisma.cmsItem.update({ where: { id }, data: { isFeatured: false } });
    }
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_ITEM_FEATURED_SET", target: `cmsItem:${existing.slug}`, payload: { value } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:item-featured-failed");
    return { ok: false, error: "Failed to update featured item." };
  }
}

/** Duplicates an item with a fresh slug and " (Copy)" suffixes. */
export async function duplicateCmsItem(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_ITEM_DUPLICATE");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid item id." };

  const id = parsed.data.id;
  const existing = await prisma.cmsItem.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Item not found." };

  try {
    const maxOrder = await prisma.cmsItem.aggregate({ where: { sectionId: existing.sectionId }, _max: { order: true } });
    const baseSlug = `${existing.slug}-copy`;
    let slug = baseSlug;
    let i = 1;
    while (await prisma.cmsItem.findUnique({ where: { sectionId_slug: { sectionId: existing.sectionId, slug } } })) {
      i += 1;
      slug = `${baseSlug}-${i}`;
    }
    await prisma.cmsItem.create({
      data: {
        sectionId: existing.sectionId,
        slug,
        icon: existing.icon,
        titleAr: `${existing.titleAr} (نسخة)`,
        titleEn: `${existing.titleEn} (Copy)`,
        shortLabelAr: existing.shortLabelAr,
        shortLabelEn: existing.shortLabelEn,
        descriptionAr: existing.descriptionAr,
        descriptionEn: existing.descriptionEn,
        value: existing.value,
        subValue: existing.subValue,
        imageUrl: existing.imageUrl,
        linkUrl: existing.linkUrl,
        isActive: existing.isActive,
        isVisible: existing.isVisible,
        isFeatured: false,
        order: (maxOrder._max.order ?? 0) + 1,
      },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_ITEM_DUPLICATED", target: `cmsItem:${existing.slug}`, payload: { slug } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:item-duplicate-failed");
    return { ok: false, error: "Failed to duplicate item." };
  }
}

const reorderItemsSchema = z.object({
  sectionId: z.string().trim().min(1),
  itemIds: z.array(z.string().trim().min(1)).min(1),
});

export async function reorderCmsItems(formData: FormData): Promise<CmsActionResult> {
  const actor = await requirePermission("CMS_ITEM_REORDER");
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { ok: false, error: "Invalid reorder payload." };
  }
  const parsed = reorderItemsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid reorder payload." };

  const { sectionId, itemIds } = parsed.data;
  try {
    await prisma.$transaction(
      itemIds.map((itemId, index) =>
        prisma.cmsItem.updateMany({ where: { id: itemId, sectionId }, data: { order: index + 1 } })
      )
    );
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "CMS_ITEMS_REORDERED", target: `cmsSection:${sectionId}`, payload: { itemIds } });
    revalidateCms();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "cms:item-reorder-failed");
    return { ok: false, error: "Failed to reorder items." };
  }
}
