import "server-only";
import { prisma } from "./prisma";

/**
 * Sliding-window rate limiter backed by the RateLimitHit table.
 * Limits are configured in SystemSetting (limits.*) — ZERO hardcoded values.
 */
export async function checkRateLimit(input: {
  scope: string;
  key: string;
  limit: number;
  windowSec: number;
}): Promise<{ ok: boolean; remaining: number }> {
  const since = new Date(Date.now() - input.windowSec * 1000);
  const where = {
    scope: input.scope,
    key: input.key,
    createdAt: { gte: since },
  };

  await prisma.rateLimitHit
    .deleteMany({ where: { scope: input.scope, key: input.key, createdAt: { lt: since } } })
    .catch(() => {});

  const count = await prisma.rateLimitHit.count({ where });
  if (count >= input.limit) return { ok: false, remaining: 0 };

  await prisma.rateLimitHit.create({ data: { scope: input.scope, key: input.key } });
  return { ok: true, remaining: input.limit - count - 1 };
}

/** Best-effort client IP from request headers. */
export function clientIp(headerList: Headers): string {
  const fwd = headerList.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return headerList.get("x-real-ip") ?? "unknown";
}
