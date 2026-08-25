"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { audit, logger } from "@/lib/log";

export type ActiveSession = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ip: string;
  loginTime: number | null;
  lastActivity: number | null;
  remainingTime: number;
};

export type SecurityAlert = {
  id: string;
  action: string;
  target: string;
  payload: unknown;
  createdAt: Date;
};

export type SessionSettings = {
  timeoutMinutes: number;
  ipCheckEnabled: boolean;
  maxSessionsPerUser: number;
};

export async function getSessionSettings(): Promise<SessionSettings> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["session.timeout", "session.ipCheck", "session.maxPerUser"] } },
  });

  const map = new Map(settings.map((s) => [s.key, String(s.value ?? "")]));
  return {
    timeoutMinutes: parseInt(map.get("session.timeout") ?? "30", 10),
    ipCheckEnabled: map.get("session.ipCheck") !== "false",
    maxSessionsPerUser: parseInt(map.get("session.maxPerUser") ?? "3", 10),
  };
}

export async function updateSessionSettings(input: Partial<SessionSettings>): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const updates: { key: string; value: string }[] = [];
    if (input.timeoutMinutes !== undefined) {
      updates.push({ key: "session.timeout", value: String(input.timeoutMinutes) });
    }
    if (input.ipCheckEnabled !== undefined) {
      updates.push({ key: "session.ipCheck", value: String(input.ipCheckEnabled) });
    }
    if (input.maxSessionsPerUser !== undefined) {
      updates.push({ key: "session.maxPerUser", value: String(input.maxSessionsPerUser) });
    }

    for (const u of updates) {
      await prisma.systemSetting.upsert({
        where: { key: u.key },
        update: { value: u.value },
        create: { key: u.key, value: u.value, category: "DEFAULTS" },
      });
    }

    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "SESSION_SETTINGS_UPDATED",
      target: "system",
      payload: input,
    });

    return { ok: true };
  } catch (err) {
    logger.error({ err }, "session-settings:update-failed");
    return { ok: false, error: "Failed to update settings" };
  }
}

export async function getSecurityAlerts(limit = 50): Promise<SecurityAlert[]> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["SESSION_EXPIRED", "SESSION_HIJACK_ATTEMPT", "SESSION_SETTINGS_UPDATED", "LOGIN_FAILED"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    target: l.target,
    payload: l.payload,
    createdAt: l.createdAt,
  }));
}

export async function getAuthAuditLog(limit = 100): Promise<SecurityAlert[]> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["REGISTER", "OTP_SENT", "SESSION_EXPIRED", "SESSION_HIJACK_ATTEMPT", "SESSION_SETTINGS_UPDATED"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    target: l.target,
    payload: l.payload,
    createdAt: l.createdAt,
  }));
}
