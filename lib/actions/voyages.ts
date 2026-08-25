"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit, logger } from "@/lib/log";
import { auth } from "@/lib/auth";

export type VoyageResult = { ok: boolean; error?: string };

// ---------- RBAC ----------

async function requireVoyageAccess(): Promise<{ actorId: string; actorRole: string } | null> {
  const session = await auth();
  const role = session?.user?.role ?? null;
  if (!session?.user || !role) return null;
  if (!["SUPER_ADMIN", "MANAGER"].includes(role)) return null;
  return { actorId: session.user.id ?? "unknown", actorRole: role };
}

function revalidateVoyages() {
  revalidatePath("/admin/voyages");
  revalidatePath("/", "layout");
  revalidatePath("/quote");
}

// ---------- Schema ----------

const voyageSchema = z.object({
  id: z.string().trim().min(1).optional(),
  originPortId: z.string().trim().min(1, "Choose an origin port."),
  destinationPortId: z.string().trim().min(1, "Choose a destination port."),
  vesselName: z.string().trim().min(1, "Enter a vessel name.").max(100),
  voyageNumber: z.string().trim().min(1, "Enter a voyage number.").max(40),
  departureDate: z.string().min(1, "Choose a departure date."),
  cutOffDate: z.string().min(1, "Choose a cut-off date."),
  arrivalDate: z.string().min(1, "Choose an arrival date."),
  voyageType: z.string().trim().min(1, "Choose a voyage type.").max(30),
  transitTime: z.coerce.number().int().min(0, "Transit time is required."),
  shippingLine: z.string().trim().min(1, "Enter a shipping line.").max(100),
  isActive: z.boolean().optional(),
  showOnCalculator: z.boolean().optional(),
});

const idSchema = z.object({ id: z.string().trim().min(1).max(40) });

// ---------- Reads ----------

export type VoyageRow = {
  id: string;
  vesselName: string;
  voyageNumber: string;
  departureDate: Date;
  cutOffDate: Date;
  arrivalDate: Date;
  voyageType: string;
  transitTime: number;
  shippingLine: string;
  isActive: boolean;
  showOnCalculator: boolean;
  originPortCode: string;
  originPortName: string;
  destinationPortCode: string;
  destinationPortName: string;
  createdAt: Date;
};

export async function getVoyages(): Promise<VoyageRow[]> {
  const voyages = await prisma.voyage.findMany({
    include: {
      originPort: { select: { code: true, name: true } },
      destinationPort: { select: { code: true, name: true } },
    },
    orderBy: [{ departureDate: "asc" }],
  });
  return voyages.map((v) => ({
    id: v.id,
    vesselName: v.vesselName,
    voyageNumber: v.voyageNumber,
    departureDate: v.departureDate,
    cutOffDate: v.cutOffDate,
    arrivalDate: v.arrivalDate,
    voyageType: v.voyageType,
    transitTime: v.transitTime,
    shippingLine: v.shippingLine,
    isActive: v.isActive,
    showOnCalculator: v.showOnCalculator,
    originPortCode: v.originPort.code,
    originPortName: v.originPort.name,
    destinationPortCode: v.destinationPort.code,
    destinationPortName: v.destinationPort.name,
    createdAt: v.createdAt,
  }));
}

// ---------- Create ----------

export async function createVoyage(formData: FormData): Promise<VoyageResult> {
  const actor = await requireVoyageAccess();
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = voyageSchema.safeParse({
    originPortId: formData.get("originPortId"),
    destinationPortId: formData.get("destinationPortId"),
    vesselName: formData.get("vesselName"),
    voyageNumber: formData.get("voyageNumber"),
    departureDate: formData.get("departureDate"),
    cutOffDate: formData.get("cutOffDate"),
    arrivalDate: formData.get("arrivalDate"),
    voyageType: formData.get("voyageType"),
    transitTime: formData.get("transitTime"),
    shippingLine: formData.get("shippingLine"),
    isActive: formData.get("isActive") !== "false",
    showOnCalculator: formData.get("showOnCalculator") !== "false",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid voyage data." };

  const d = parsed.data;

  try {
    await prisma.voyage.create({
      data: {
        originPortId: d.originPortId,
        destinationPortId: d.destinationPortId,
        vesselName: d.vesselName,
        voyageNumber: d.voyageNumber,
        departureDate: new Date(d.departureDate),
        cutOffDate: new Date(d.cutOffDate),
        arrivalDate: new Date(d.arrivalDate),
        voyageType: d.voyageType,
        transitTime: d.transitTime,
        shippingLine: d.shippingLine,
        isActive: d.isActive ?? true,
        showOnCalculator: d.showOnCalculator ?? true,
        createdBy: actor.actorId,
      },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "VOYAGE_CREATED", target: `voyage:${d.voyageNumber}` });
    revalidateVoyages();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A voyage with this number already exists." };
    logger.warn({ err: (err as Error).message }, "voyage:create-failed");
    return { ok: false, error: "Failed to create voyage." };
  }
}

// ---------- Update ----------

export async function updateVoyage(formData: FormData): Promise<VoyageResult> {
  const actor = await requireVoyageAccess();
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const parsed = voyageSchema.safeParse({
    id,
    originPortId: formData.get("originPortId"),
    destinationPortId: formData.get("destinationPortId"),
    vesselName: formData.get("vesselName"),
    voyageNumber: formData.get("voyageNumber"),
    departureDate: formData.get("departureDate"),
    cutOffDate: formData.get("cutOffDate"),
    arrivalDate: formData.get("arrivalDate"),
    voyageType: formData.get("voyageType"),
    transitTime: formData.get("transitTime"),
    shippingLine: formData.get("shippingLine"),
    isActive: formData.get("isActive") !== "false",
    showOnCalculator: formData.get("showOnCalculator") !== "false",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid voyage data." };

  const existing = await prisma.voyage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Voyage not found." };

  const d = parsed.data;
  try {
    await prisma.voyage.update({
      where: { id },
      data: {
        originPortId: d.originPortId,
        destinationPortId: d.destinationPortId,
        vesselName: d.vesselName,
        voyageNumber: d.voyageNumber,
        departureDate: new Date(d.departureDate),
        cutOffDate: new Date(d.cutOffDate),
        arrivalDate: new Date(d.arrivalDate),
        voyageType: d.voyageType,
        transitTime: d.transitTime,
        shippingLine: d.shippingLine,
        isActive: d.isActive ?? true,
        showOnCalculator: d.showOnCalculator ?? true,
      },
    });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "VOYAGE_UPDATED", target: `voyage:${d.voyageNumber}` });
    revalidateVoyages();
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return { ok: false, error: "A voyage with this number already exists." };
    logger.warn({ err: (err as Error).message }, "voyage:update-failed");
    return { ok: false, error: "Failed to update voyage." };
  }
}

// ---------- Delete ----------

export async function deleteVoyage(formData: FormData): Promise<VoyageResult> {
  const actor = await requireVoyageAccess();
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return { ok: false, error: "Invalid voyage id." };

  const existing = await prisma.voyage.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return { ok: false, error: "Voyage not found." };

  try {
    await prisma.voyage.delete({ where: { id: parsed.data.id } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "VOYAGE_DELETED", target: `voyage:${existing.voyageNumber}` });
    revalidateVoyages();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "voyage:delete-failed");
    return { ok: false, error: "Failed to delete voyage." };
  }
}

// ---------- Toggle ----------

export async function toggleVoyageActive(formData: FormData): Promise<VoyageResult> {
  const actor = await requireVoyageAccess();
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const value = formData.get("value") === "true";

  const existing = await prisma.voyage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Voyage not found." };

  try {
    await prisma.voyage.update({ where: { id }, data: { isActive: value } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "VOYAGE_TOGGLED", target: `voyage:${existing.voyageNumber}`, payload: { isActive: value } });
    revalidateVoyages();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "voyage:toggle-failed");
    return { ok: false, error: "Failed to update voyage." };
  }
}

export async function toggleVoyageShowOnCalculator(formData: FormData): Promise<VoyageResult> {
  const actor = await requireVoyageAccess();
  if (!actor) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const value = formData.get("value") === "true";

  const existing = await prisma.voyage.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Voyage not found." };

  try {
    await prisma.voyage.update({ where: { id }, data: { showOnCalculator: value } });
    await audit({ actorId: actor.actorId, actorRole: actor.actorRole, action: "VOYAGE_CALC_TOGGLED", target: `voyage:${existing.voyageNumber}`, payload: { showOnCalculator: value } });
    revalidateVoyages();
    return { ok: true };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "voyage:calc-toggle-failed");
    return { ok: false, error: "Failed to update voyage." };
  }
}
