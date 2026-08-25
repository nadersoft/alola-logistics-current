"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  await prisma.notification.updateMany({ where: { id, userId: session.user.id }, data: { readAt: new Date() } });
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  await prisma.notification.updateMany({ where: { userId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  return { ok: true };
}

const inboxSchema = z.object({ limit: z.coerce.number().int().min(1).max(50).default(12) });

export async function getNotificationInbox(formData: FormData): Promise<{ ok: boolean; items?: unknown[] }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  const parsed = inboxSchema.safeParse({ limit: formData.get("limit") ?? 12 });
  const limit = parsed.success ? parsed.data.limit : 12;
  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, title: true, body: true, type: true, readAt: true, createdAt: true },
  });
  return { ok: true, items };
}
