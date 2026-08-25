import "server-only";
import pino from "pino";
import { prisma } from "./prisma";

/**
 * Safe Logging (Protocol 4): non-blocking pino wrapper.
 * Levels: info | warn | error. Every SystemSetting mutation is audited here.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
});

type AuditInput = {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  target: string;
  payload?: unknown;
};

export async function audit(input: AuditInput) {
  const meta = {
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    target: input.target,
  };
  try {
    await prisma.auditLog.create({
      data: {
        ...meta,
        payload: input.payload as object | undefined,
      },
    });
    logger.info(meta, "audit");
  } catch (err) {
    logger.error({ err, ...meta }, "audit:failed-to-write");
  }
}
