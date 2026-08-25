"use server";

import { z } from "zod";
import { headers } from "next/headers";
import type { Mode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettingOr } from "@/lib/settings";
import { audit, logger } from "@/lib/log";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { auth } from "@/auth";
import {
  airChargeable,
  convert,
  lclChargeable,
  quoteTotal,
  round2,
  type Surcharges,
} from "@/lib/calculation";
import { matchBestRule, type MatchedRule } from "@/lib/engine/ruleMatcher";

export type QuoteMode = "FCL" | "LCL" | "AIR";

// ---------- Safe number coercion (handles Prisma Decimal, raw query strings, BigInt) ----------

function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") return parseFloat(v) || 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "object" && v !== null) {
    const obj = v as Record<string, unknown>;
    if (typeof obj.toNumber === "function") {
      try { return obj.toNumber(); } catch { /* fallthrough */ }
    }
    if (typeof obj.toString === "function") {
      const parsed = parseFloat(String(obj.toString()));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRate(r: Record<string, any>): Record<string, any> {
  if (!r) return r;
  return {
    ...r,
    baseCost: num(r.baseCost ?? r.price ?? r.basePrice),
    price: num(r.price ?? r.baseCost),
    basePrice: num(r.basePrice ?? r.price),
    transitDays: num(r.transitDays),
  };
}

// ---------- Validation: all fields required, strict ----------

const quoteSchema = z.object({
  mode: z.enum(["FCL", "LCL", "AIR"], "Choose a shipping mode."),
  origin: z.string().trim().min(2, "Choose an origin port.").max(8),
  destination: z.string().trim().min(2, "Choose a destination port.").max(8),
  containerType: z.string().trim().min(1, "Choose a container type.").max(16),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1.").max(100),
  length: z.coerce.number().min(0).max(100000).optional(),
  width: z.coerce.number().min(0).max(100000).optional(),
  height: z.coerce.number().min(0).max(100000).optional(),
  weight: z.coerce.number().min(0).max(1000000).optional(),
  equipmentType: z.string().optional().default("Dry"),
  equipmentSizes: z.string().optional().default("[]"),
  commodity: z.string().optional().default(""),
  hsCode: z.string().optional().default(""),
  isFAK: z.string().optional().default("true").transform((v) => v === "true" || v === "1"),
  cargoWeight: z.coerce.number().min(0).max(100000).optional().default(18000),
  weightUnit: z.string().optional().default("KGS"),
  temperature: z.coerce.number().min(-30).max(60).optional().default(0),
  tempUnit: z.string().optional().default("C"),
  originCountry: z.string().optional().default(""),
  destinationCountry: z.string().optional().default(""),
  isDG: z.string().optional().default("false").transform((v) => v === "true" || v === "1"),
  dgClass: z.string().optional().default(""),
  unNumber: z.string().optional().default(""),
});

type QuoteInput = z.infer<typeof quoteSchema>;

// ---------- Single offer result type ----------

export type SingleOffer = {
  available: boolean;
  baseTotal: number;
  surcharges: {
    baf: number;
    thcOrigin: number;
    thcDestination: number;
    fuel: number;
    insurance: number;
    profit: number;
    dg: number;
    reefer: number;
  };
  total: number;
};

export type QuoteResult = {
  ok: boolean;
  error?: string;
  mode?: QuoteMode;
  originCode?: string;
  destinationCode?: string;
  containerTypeCode?: string;
  chargeable?: number;
  chargeableLabel?: string;
  offer?: SingleOffer;
  currency?: string;
  currencySymbol?: string;
  validUntil?: Date;
  voyages?: VoyageBrief[];
  freeTimeDays?: number;
};

export type VoyageBrief = {
  id: string;
  vesselName: string;
  voyageNumber: string;
  departureDate: Date;
  cutOffDate: Date;
  arrivalDate: Date;
  voyageType: string;
  transitTime: number;
  shippingLine: string;
};

type LaneResult =
  | {
      ok: true;
      meta: {
        mode: QuoteMode;
        originPortId: string;
        destinationPortId: string;
        containerTypeId: string;
        quantity: number;
        chargeable: number;
        chargeableLabel: string;
      };
      offer: SingleOffer;
      surcharges: Surcharges;
      baseCurrency: string;
      displayCurrency: string;
      rate: number;
    }
  | { ok: false; error: string };

// ---------- Free time logic ----------

function getFreeTimeDays(isReefer: boolean): number {
  return isReefer ? 3 : 14;
}

// ---------- Find nearest upcoming voyages ----------

export async function findNearestVoyages(
  originPortId: string,
  destinationPortId: string,
  limit = 3
): Promise<VoyageBrief[]> {
  const voyages = await prisma.voyage.findMany({
    where: {
      originPortId,
      destinationPortId,
      isActive: true,
      departureDate: { gte: new Date() },
    },
    orderBy: { departureDate: "asc" },
    take: limit,
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
  }));
}

// ---------- Core pricing: single STANDARD tier, exact container match ----------

async function computeLaneQuote(input: QuoteInput): Promise<LaneResult> {
  const origin = await prisma.port.findFirst({
    where: { code: input.origin.toUpperCase(), isActive: true },
  });
  const destination = await prisma.port.findFirst({
    where: { code: input.destination.toUpperCase(), isActive: true },
  });
  if (!origin || !destination)
    return { ok: false, error: "One of the selected ports is unavailable." };
  if (origin.id === destination.id)
    return { ok: false, error: "Origin and destination must be different ports." };

  // Exact container type match — no fallback
  const containerType = await prisma.containerType.findFirst({
    where: { code: input.containerType.toUpperCase(), isActive: true },
  });
  if (!containerType)
    return {
      ok: false,
      error: `Container type "${input.containerType}" is not available.`,
    };

  const quantity = Math.max(1, Math.min(100, input.quantity ?? 1));

  let chargeable: number;
  let chargeableLabel: string;
  if (input.mode === "FCL") {
    chargeable = quantity;
    chargeableLabel = "container(s)";
  } else if (input.mode === "LCL") {
    chargeable = round2(
      lclChargeable({
        length: input.length ?? 0,
        width: input.width ?? 0,
        height: input.height ?? 0,
        quantity,
        weight: input.weight ?? 0,
      })
    );
    chargeableLabel = "CBM";
  } else {
    chargeable = round2(
      airChargeable({
        length: input.length ?? 0,
        width: input.width ?? 0,
        height: input.height ?? 0,
        quantity,
        weight: input.weight ?? 0,
      })
    );
    chargeableLabel = "kg";
  }
  if (input.mode !== "FCL" && chargeable <= 0)
    return { ok: false, error: "Enter cargo dimensions and weight." };

  console.log(`[PRICING] Search ${input.origin.toUpperCase()}->${input.destination.toUpperCase()} ${input.containerType} mode=${input.mode} weight=${input.cargoWeight}kg`);
  console.log(`[PRICING] Resolved IDs: origin=${origin.id} dest=${destination.id} container=${containerType.id}`);

  // Single STANDARD tier — exact containerTypeId match
  // Safe: explicit columns in raw query (avoids voyageId column crash), prisma fallback second
  let rate: Record<string, unknown> | null = null;
  try {
    const raw: unknown = await prisma.$queryRaw`
      SELECT "id","originPortId","destinationPortId","mode","containerTypeId",
             "tier","baseCost","dgSurcharge","dgMultiplier","reeferSurcharge",
             "isActive","createdAt","updatedAt"
      FROM "ShippingRate"
      WHERE "originPortId" = ${origin.id}::uuid
        AND "destinationPortId" = ${destination.id}::uuid
        AND "containerTypeId" = ${containerType.id}::uuid
        AND "mode" = ${input.mode}::"Mode"
        AND "tier" = 'STANDARD'
        AND "isActive" = true
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    rate = Array.isArray(raw) && raw.length > 0 ? normalizeRate(raw[0]) : null;
  } catch (e: unknown) {
    console.warn("[quote] raw ShippingRate query failed, trying prisma client:", (e as Error).message);
    try {
      const prismaRate = await prisma.shippingRate.findFirst({
        where: {
          originPortId: origin.id,
          destinationPortId: destination.id,
          containerTypeId: containerType.id,
          tier: "STANDARD",
          isActive: true,
        },
        orderBy: { id: "desc" },
      });
      rate = prismaRate ? normalizeRate(prismaRate as unknown as Record<string, unknown>) : null;
    } catch (e2: unknown) {
      console.warn("[quote] prisma fallback also failed:", (e2 as Error).message);
      return {
        ok: false,
        error:
          "No live rate for this route and container type yet — contact us for a manual quote.",
      };
    }
  }
  // Fallback: if no ShippingRate found, try PricingRule via matchBestRule (only 100% or 90% — reject 70% mode-only)
  if (!rate) {
    console.log("[PRICING] No ShippingRate found, trying PricingRule fallback...");
    const matchedRule = await matchBestRule({
      originPortId: origin.id,
      destinationPortId: destination.id,
      mode: input.mode,
      containerTypeId: containerType.id,
      weightKg: input.mode === "FCL" ? input.cargoWeight : undefined,
      containers: input.mode === "FCL" ? quantity : undefined,
    });
    if (matchedRule && matchedRule.matchPct >= 90) {
      console.log(`[PRICING] PricingRule matched: ${matchedRule.rule.name} (${matchedRule.matchPct}% match), base=$${matchedRule.breakdown.base}, total=$${matchedRule.breakdown.total}`);
      rate = {
        baseCost: matchedRule.breakdown.base,
        dgSurcharge: 150,
        dgMultiplier: 1.25,
        reeferSurcharge: 200,
        _matchedRule: matchedRule,
      };
    }
  }

  if (!rate) {
    console.log("[PRICING] No rate found from ShippingRate or PricingRule");
    return {
      ok: false,
      error:
        "No live rate for this route and container type yet — contact us for a manual quote.",
    };
  }

  const [surcharges, baseCurrency, displayCurrency] = await Promise.all([
    getSettingOr<Surcharges>("pricing.surcharges", {
      baf: 0,
      thcOrigin: 0,
      thcDestination: 0,
      fuelPct: 0,
      insurancePct: 0,
      profitMarginPct: 0,
    }),
    getSettingOr<string>("pricing.currencyBase", "USD"),
    getSettingOr<string>("defaults.currency", "SAR"),
  ]);

  let exchRate = 1;
  if (baseCurrency !== displayCurrency) {
    const exchange = await prisma.exchangeRate.findUnique({
      where: { currency: baseCurrency },
    });
    exchRate = exchange ? num(exchange.rate) : 1;
  }

  // Use matched rule breakdown if available (PricingRule fallback), otherwise compute from ShippingRate
  const matchedRule = (rate as Record<string, unknown>)._matchedRule as MatchedRule | undefined;
  let baseTotal: number;
  let ruleSurcharges: { baf: number; thcOrigin: number; thcDestination: number; fuel: number; insurance: number; profit: number } | null = null;

  if (matchedRule) {
    // PricingRule path: breakdown already includes base + fields + FOB/EXW + weight
    baseTotal = matchedRule.breakdown.total;
    ruleSurcharges = {
      baf: 0,
      thcOrigin: 0,
      thcDestination: 0,
      fuel: 0,
      insurance: 0,
      profit: 0,
    };
  } else {
    // ShippingRate path: compute from base cost + system surcharges
    baseTotal = num(rate.baseCost) * chargeable;
  }

  const inBase = matchedRule ? baseTotal : quoteTotal(baseTotal, surcharges);

  // DG surcharge calculation
  let dgSurcharge = 0;
  if (input.isDG) {
    const rateDgSurcharge = num(rate.dgSurcharge ?? 150);
    const rateDgMultiplier = (rate.dgMultiplier as unknown as number) ?? 1.25;
    dgSurcharge = rateDgSurcharge;
    // Class 1 (explosives) and Class 7 (radioactive) get 1.5x multiplier
    if (input.dgClass === "1" || input.dgClass === "7") {
      dgSurcharge = rateDgSurcharge * 1.5;
    } else if (rateDgMultiplier !== 1.25) {
      dgSurcharge = baseTotal * (rateDgMultiplier - 1);
    }
  }

  // Reefer surcharge
  let reeferSurcharge = 0;
  if (input.equipmentType === "Reefer" || (input.temperature && input.temperature !== 0)) {
    reeferSurcharge = num(rate.reeferSurcharge ?? 200);
  }

  const totalWithExtras = inBase + dgSurcharge + reeferSurcharge;

  const offer: SingleOffer = {
    available: true,
    baseTotal: round2(matchedRule ? matchedRule.breakdown.base : baseTotal),
    surcharges: {
      baf: round2(ruleSurcharges?.baf ?? surcharges.baf),
      thcOrigin: round2(ruleSurcharges?.thcOrigin ?? surcharges.thcOrigin),
      thcDestination: round2(ruleSurcharges?.thcDestination ?? surcharges.thcDestination),
      fuel: round2(ruleSurcharges?.fuel ?? inBase * (surcharges.fuelPct / 100)),
      insurance: round2(ruleSurcharges?.insurance ?? inBase * (surcharges.insurancePct / 100)),
      profit: round2(ruleSurcharges?.profit ?? inBase * (surcharges.profitMarginPct / 100)),
      dg: round2(dgSurcharge),
      reefer: round2(reeferSurcharge),
    },
    total: round2(convert(totalWithExtras, exchRate)),
  };

  return {
    ok: true,
    meta: {
      mode: input.mode,
      originPortId: origin.id,
      destinationPortId: destination.id,
      containerTypeId: containerType.id,
      quantity,
      chargeable,
      chargeableLabel,
    },
    offer,
    surcharges,
    baseCurrency,
    displayCurrency,
    rate: exchRate,
  };
}

// ---------- Public: instant quote (no auth, rate-limited) ----------

export async function instantQuote(formData: FormData): Promise<QuoteResult> {
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid quote form data.",
    };
  }

  const headerList = headers();
  const ip = clientIp(headerList);
  const limit = await getSettingOr<number>("limits.quotePerMinute", 10);
  const rl = await checkRateLimit({ scope: "quote", key: ip, limit, windowSec: 60 });
  if (!rl.ok) {
    logger.warn({ scope: "quote", ip }, "rate-limited");
    return {
      ok: false,
      error: "Too many quote requests. Please try again in a minute.",
    };
  }

  const lane = await computeLaneQuote(parsed.data);
  if (!lane.ok) return { ok: false, error: lane.error };

  const validUntil = new Date(Date.now() + 24 * 3_600_000);
  const isReefer = parsed.data.containerType.toUpperCase().includes("RF");
  const freeTimeDays = getFreeTimeDays(isReefer);

  const voyages = await findNearestVoyages(
    lane.meta.originPortId,
    lane.meta.destinationPortId
  );

  return {
    ok: true,
    mode: lane.meta.mode,
    originCode: parsed.data.origin.toUpperCase(),
    destinationCode: parsed.data.destination.toUpperCase(),
    containerTypeCode: parsed.data.containerType.toUpperCase(),
    chargeable: lane.meta.chargeable,
    chargeableLabel: lane.meta.chargeableLabel,
    offer: lane.offer,
    currency: lane.displayCurrency,
    currencySymbol: await getSettingOr<string>("defaults.currencySymbol", ""),
    validUntil,
    voyages,
    freeTimeDays,
  };
}

// ---------- Auth-gated: persist quote as a booking request ----------

export type RequestQuoteResult = {
  ok: boolean;
  error?: string;
  signInRequired?: boolean;
  quoteNumber?: string;
  validUntil?: Date;
};

const requestSchema = z.object({
  mode: z.enum(["FCL", "LCL", "AIR"]),
  origin: z.string().trim().min(2).max(8),
  destination: z.string().trim().min(2).max(8),
  containerType: z.string().trim().min(1).max(16),
  quantity: z.coerce.number().int().min(1).max(100),
  length: z.coerce.number().min(0).max(100000).optional(),
  width: z.coerce.number().min(0).max(100000).optional(),
  height: z.coerce.number().min(0).max(100000).optional(),
  weight: z.coerce.number().min(0).max(1000000).optional(),
  voyageId: z.string().trim().optional(),
  equipmentType: z.string().optional().default("Dry"),
  equipmentSizes: z.string().optional().default("[]"),
  commodity: z.string().optional().default(""),
  hsCode: z.string().optional().default(""),
  isFAK: z.string().optional().default("true").transform((v) => v === "true" || v === "1"),
  cargoWeight: z.coerce.number().min(0).max(100000).optional().default(18000),
  weightUnit: z.string().optional().default("KGS"),
  temperature: z.coerce.number().min(-30).max(60).optional().default(0),
  tempUnit: z.string().optional().default("C"),
  originCountry: z.string().optional().default(""),
  destinationCountry: z.string().optional().default(""),
  isDG: z.string().optional().default("false").transform((v) => v === "true" || v === "1"),
  dgClass: z.string().optional().default(""),
  unNumber: z.string().optional().default(""),
});

export async function requestQuote(
  formData: FormData
): Promise<RequestQuoteResult> {
  const session = await auth();
  if (!session?.user)
    return { ok: false, error: "SIGN_IN_REQUIRED", signInRequired: true };

  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid quote form data.",
    };
  }

  const lane = await computeLaneQuote(parsed.data);
  if (!lane.ok) return { ok: false, error: lane.error };

  const email = session.user.email ?? null;
  let customerId: string | null = null;
  if (email) {
    let customer = await prisma.customer.findFirst({ where: { email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: session.user.name ?? email, email },
      });
    }
    customerId = customer.id;
  }

  const validUntil = new Date(Date.now() + 24 * 3_600_000);
  const isReefer = parsed.data.equipmentType === "Reefer" || parsed.data.containerType.toUpperCase().includes("RF");
  const freeTimeDays = getFreeTimeDays(isReefer);

  let sizes: string[] = ["20GP"];
  try { sizes = JSON.parse(parsed.data.equipmentSizes || "[]"); } catch { /* keep default */ }

  const quote = await prisma.quote.create({
    data: {
      quoteNumber: await nextQuoteNumber(),
      customerId,
      mode: parsed.data.mode as Mode,
      originPortId: lane.meta.originPortId,
      destinationPortId: lane.meta.destinationPortId,
      containerTypeId: lane.meta.containerTypeId,
      voyageId: parsed.data.voyageId || null,
      freeTimeDays,
      tier: "STANDARD",
      cargo: {
        dims: {
          quantity: lane.meta.quantity,
          length: parsed.data.length ?? 0,
          width: parsed.data.width ?? 0,
          height: parsed.data.height ?? 0,
          weight: parsed.data.weight ?? 0,
        },
        containerTypeCode: parsed.data.containerType.toUpperCase(),
        chargeable: lane.meta.chargeable,
        chargeableLabel: lane.meta.chargeableLabel,
      },
      baseCost: lane.offer.baseTotal,
      surcharges: lane.offer.surcharges,
      total: lane.offer.total,
      currency: lane.displayCurrency,
      status: "PENDING",
      validUntil,
      equipmentType: parsed.data.equipmentType,
      equipmentSizes: sizes,
      commodity: parsed.data.commodity || null,
      hsCode: parsed.data.hsCode || null,
      isFAK: parsed.data.isFAK,
      cargoWeight: parsed.data.cargoWeight,
      weightUnit: parsed.data.weightUnit,
      temperature: parsed.data.temperature,
      tempUnit: parsed.data.tempUnit,
      originCountry: parsed.data.originCountry,
      destinationCountry: parsed.data.destinationCountry,
      isDG: parsed.data.isDG,
      dgClass: parsed.data.isDG ? parsed.data.dgClass || null : null,
      unNumber: parsed.data.isDG ? parsed.data.unNumber || null : null,
      dgSurcharge: lane.offer.surcharges.dg,
    },
  });

  await prisma.notification.create({
    data: {
      type: "quote",
      title: `New quote request ${quote.quoteNumber}`,
      body: `${parsed.data.mode} ${parsed.data.origin.toUpperCase()} → ${parsed.data.destination.toUpperCase()} · STANDARD · ${lane.offer.total} ${lane.displayCurrency}`,
    },
  });

  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "QUOTE_REQUEST",
    target: `quote:${quote.quoteNumber}`,
    payload: {
      mode: parsed.data.mode,
      lane: `${parsed.data.origin.toUpperCase()}->${parsed.data.destination.toUpperCase()}`,
      tier: "STANDARD",
      voyageId: parsed.data.voyageId || null,
      freeTimeDays,
    },
  });

  return {
    ok: true,
    quoteNumber: quote.quoteNumber,
    validUntil: quote.validUntil ?? undefined,
  };
}

async function nextQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ALO-${year}-`;
  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
    select: { quoteNumber: true },
  });
  const seq = last
    ? (parseInt(last.quoteNumber.slice(prefix.length), 10) || 0) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
