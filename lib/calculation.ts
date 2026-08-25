/**
 * Pure freight math. NO DB access, NO I/O.
 * Prices are computed ONLY from DB rates + surcharges (from SystemSetting).
 */

export type Surcharges = {
  baf: number;
  thcOrigin: number;
  thcDestination: number;
  fuelPct: number;
  insurancePct: number;
  profitMarginPct: number;
};

export type Dimensions = {
  length: number;
  width: number;
  height: number;
  quantity: number;
  weight: number;
};

export const DEFAULT_SURCHARGES: Surcharges = {
  baf: 0,
  thcOrigin: 0,
  thcDestination: 0,
  fuelPct: 0,
  insurancePct: 0,
  profitMarginPct: 0,
};

/** AIR chargeable weight = max(actual weight, volumetric weight). Divisor 6000 (IATA). */
export function airChargeable(
  dims: Dimensions,
  divisor = 6000
): number {
  const volumetric = (dims.length * dims.width * dims.height * dims.quantity) / divisor;
  return Math.max(dims.weight, volumetric);
}

/** LCL CBM = (L*W*H / 1,000,000) * Qty (cm → m³). */
export function lclCbm(dims: Pick<Dimensions, "length" | "width" | "height" | "quantity">): number {
  return (dims.length * dims.width * dims.height * dims.quantity) / 1_000_000;
}

/** LCL chargeable = max(CBM, weight/1000). */
export function lclChargeable(dims: Dimensions): number {
  return Math.max(lclCbm(dims), dims.weight / 1000);
}

/**
 * Freight total = (base + flat surcharges) × (1 + pct surcharges/100).
 * baseCost and flat surcharges are in the same currency (stored USD).
 */
export function quoteTotal(baseCost: number, surcharges: Surcharges): number {
  const flat = baseCost + surcharges.baf + surcharges.thcOrigin + surcharges.thcDestination;
  const pct = 1 + (surcharges.fuelPct + surcharges.insurancePct + surcharges.profitMarginPct) / 100;
  return flat * pct;
}

/** Convert an amount from a currency into the display (default) currency. */
export function convert(amount: number, rate: number): number {
  return amount * rate;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
