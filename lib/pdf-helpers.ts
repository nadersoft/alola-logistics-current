"use client";

import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";

export async function getLogoDataUrl(url: string | null | undefined): Promise<string | null> {
  try {
    const normalized = normalizeLogoUrl(url);
    if (!normalized) return null;
    if (normalized.startsWith("data:")) return normalized;

    const fullUrl = normalized.startsWith("http")
      ? normalized
      : typeof window !== "undefined"
        ? window.location.origin + normalized
        : normalized;

    const res = await fetch(fullUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
