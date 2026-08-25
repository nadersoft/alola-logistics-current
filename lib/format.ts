export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return parseFloat(value) || 0;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "object" && "toNumber" in value && typeof (value as Record<string, unknown>).toNumber === "function") {
    try { return (value as { toNumber: () => number }).toNumber(); } catch { return 0; }
  }
  return 0;
}

export function formatCurrency(amount: unknown, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(toNumber(amount));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en").format(value);
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}
