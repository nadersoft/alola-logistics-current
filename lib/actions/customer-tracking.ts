"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { audit, logger } from "@/lib/log";

export type CustomerTrackingRow = {
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  country: string | null;
  originCountry: string | null;
  city: string | null;
  address: string | null;
  profileUpdatedAt: string | null;
  accountCreatedAt: string;
  accountUpdatedAt: string;
};

export type CustomerTrackingResult = {
  ok: boolean;
  error?: string;
  rows?: CustomerTrackingRow[];
};

export async function getCustomerTracking(): Promise<CustomerTrackingResult> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) return { ok: false, error: "FORBIDDEN" };

  try {
    const users = await prisma.user.findMany({
      where: { role: "CLIENT" },
      orderBy: { updatedAt: "desc" },
      include: { profile: true },
    });

    const rows: CustomerTrackingRow[] = users.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      phoneVerified: u.phoneVerified,
      country: u.profile?.country ?? null,
      originCountry: u.profile?.originCountry ?? null,
      city: u.profile?.city ?? null,
      address: u.profile?.address ?? null,
      profileUpdatedAt: u.profile?.updatedAt.toISOString() ?? null,
      accountCreatedAt: u.createdAt.toISOString(),
      accountUpdatedAt: u.updatedAt.toISOString(),
    }));

    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "CUSTOMER_TRACKING_VIEWED",
      target: "customerTracking",
      payload: { count: rows.length },
    });

    return { ok: true, rows };
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "customer-tracking:fetch-failed");
    return { ok: false, error: "Failed to load customer tracking data." };
  }
}
