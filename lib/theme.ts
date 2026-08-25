import type { SystemSetting } from "@prisma/client";

// ---------- Settings helpers ----------

export function toSettingMap(settings: SystemSetting[]): Record<string, unknown> {
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export function getString(map: Record<string, unknown>, key: string, fallback: string): string {
  const v = map[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

export function getNumber(map: Record<string, unknown>, key: string, fallback: number): number {
  const v = map[key];
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback;
}

/** Parse a JSON value (object/array) stored in a setting; returns the fallback on any failure. */
export function getJson<T>(map: Record<string, unknown>, key: string, fallback: T): T {
  const v = map[key];
  if (typeof v === "object" && v !== null) return v as T;
  if (typeof v === "string" && v.length > 0) {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// ---------- Color math (hex → readable foreground) ----------

export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function readableOn(hex: string): string {
  return luminance(hex) > 0.55 ? "#0b1220" : "#ffffff";
}

export function toHex(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

/** hex → "r, g, b" (for rgba() composition). Falls back to a given triplet. */
export function hexToRgbTriplet(hex: string, fallback: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return fallback;
  return `${r}, ${g}, ${b}`;
}

/** 0–100 opacity → clamped 0–1 alpha string. */
export function clampOpacity(value: unknown, fallback: number): number {
  const n = typeof value === "number" && !Number.isNaN(value) ? value : fallback;
  return Math.min(100, Math.max(0, n)) / 100;
}

// ---------- Theme builder (ZERO hardcode: brand colors come from SystemSetting) ----------

export type ThemeVars = {
  /** CSS custom-property overrides for :root and .dark (brand tokens only). */
  css: string;
  fontFamily: string;
  fontBaseSize: number;
};

export function buildTheme(settings: SystemSetting[]): ThemeVars {
  const map = toSettingMap(settings);

  const primary = toHex(map["appearance.primary"], "#004fba");
  const accent = toHex(map["appearance.accent"], "#0055ff");
  const radius = getString(map, "appearance.radius", "0.625rem");
  const fontFamily = getString(map, "appearance.fontFamily", "Inter");
  const fontBaseSize = getNumber(map, "appearance.fontBaseSize", 16);

  // ---- UX Kit tokens (Hero + Glass + Pulse) — driven by Appearance settings ----
  const heroFrom = toHex(map["appearance.heroGradientFrom"], "#0a1628");
  const heroMid = toHex(map["appearance.heroGradientMid"], "#004fba");
  const heroTo = toHex(map["appearance.heroGradientTo"], "#0055ff");
  const heroAngle = getNumber(map, "appearance.heroGradientAngle", 135);

  const textFrom = toHex(map["appearance.textGradientFrom"], "#004fba");
  const textTo = toHex(map["appearance.textGradientTo"], "#0055ff");

  const glassBg = hexToRgbTriplet(toHex(map["appearance.glassBg"], "#ffffff"), "255, 255, 255");
  const glassOpacity = clampOpacity(map["appearance.glassBgOpacity"], 85);
  const glassBlur = getNumber(map, "appearance.glassBlur", 20);

  const cardShadowColor = hexToRgbTriplet(toHex(map["appearance.cardShadowColor"], "#004fba"), "0, 79, 186");
  const cardShadowOpacity = clampOpacity(map["appearance.cardShadowOpacity"], 25);
  const cardLift = getNumber(map, "appearance.cardLift", 4);

  const pulseColor = toHex(map["appearance.pulseColor"], "#10b981");
  const pulseDuration = getNumber(map, "appearance.pulseDuration", 2);
  const marqueeDuration = getNumber(map, "appearance.marqueeDuration", 28);

  const brandBlock = `
    --primary: ${primary};
    --primary-foreground: ${readableOn(primary)};
    --accent: ${accent};
    --accent-foreground: ${readableOn(accent)};
    --ring: ${accent};
    --sidebar-primary: ${primary};
    --sidebar-primary-foreground: ${readableOn(primary)};
    --radius: ${radius};
  `;

  const uxBlock = `
    --hero-gradient: linear-gradient(${heroAngle}deg, ${heroFrom} 0%, ${heroMid} 50%, ${heroTo} 100%);
    --gradient-text: linear-gradient(${heroAngle}deg, ${textFrom} 0%, ${textTo} 100%);
    --glass-bg: rgba(${glassBg}, ${glassOpacity});
    --glass-blur: ${glassBlur}px;
    --card-hover-lift: -${cardLift}px;
    --card-hover-shadow: 0 20px 40px -12px rgba(${cardShadowColor}, ${cardShadowOpacity});
    --pulse-color: ${pulseColor};
    --pulse-duration: ${pulseDuration}s;
    --marquee-duration: ${marqueeDuration}s;
  `;

  return {
    css: `:root{${brandBlock}${uxBlock}}.dark{${brandBlock}}`,
    fontFamily,
    fontBaseSize,
  };
}
