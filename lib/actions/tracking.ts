"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSettingOr, readSecret } from "@/lib/settings";
import { audit, logger } from "@/lib/log";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const trackSchema = z.object({
  ref: z.string().trim().min(3, "Enter a booking reference or container number.").max(60),
});

export type TrackResult = {
  ok: boolean;
  error?: string;
  ref?: string;
};

/**
 * Real tracking (ZERO mock): validates input, rate-limits by IP, then looks up
 * the shipment in Prisma. If a Ship24 API key is configured and no internal
 * shipment matched, falls back to Ship24 courier lookup.
 */
export async function trackShipment(formData: FormData): Promise<TrackResult> {
  const parsed = trackSchema.safeParse({ ref: formData.get("ref") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reference." };
  }

  const headerList = headers();
  const ip = clientIp(headerList);
  const limit = await getSettingOr<number>("limits.trackingPerMinute", 20);
  const rl = await checkRateLimit({ scope: "tracking", key: ip, limit, windowSec: 60 });
  if (!rl.ok) {
    logger.warn({ scope: "tracking", ip }, "rate-limited");
    return { ok: false, error: "Too many attempts. Please try again in a minute." };
  }

  const ref = parsed.data.ref.toUpperCase();
  const shipment = await prisma.shipment.findFirst({
    where: { shipmentNumber: ref },
    include: {
      originPort: true,
      destinationPort: true,
      carrier: true,
      containerType: true,
      customer: true,
    },
  });

  await audit({
    action: "TRACK_SHIPMENT",
    target: shipment ? `shipment:${shipment.id}` : `ref:${ref}`,
    payload: { ref, ip },
  });

  if (shipment) return { ok: true, ref: shipment.shipmentNumber };

  // Optional Ship24 fallback when the platform key is configured.
  const apiKey = await readSecret("integration.tracking.apiKey");
  if (apiKey) {
    try {
      const res = await fetch(
        `https://api.ship24.com/public/v1/trackers/${encodeURIComponent(ref)}/results`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (res.ok) {
        const data = (await res.json()) as { data?: { trackings?: unknown[] } };
        if (data?.data?.trackings?.length) {
          return { ok: true, ref };
        }
      }
    } catch (err) {
      logger.error({ err, ref }, "ship24:lookup-failed");
    }
  }

  return { ok: false, error: "No shipment found with this reference. Check the number and try again." };
}
