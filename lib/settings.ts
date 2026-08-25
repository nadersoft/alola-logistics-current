import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import type { Category } from "@prisma/client";
import { prisma } from "./prisma";
import { audit, logger } from "./log";
import { decryptSecret, isEncrypted } from "./crypto";

export const SETTINGS_TAG = "settings";

// ---------- Read (cached, tag 'settings') ----------

async function fetchAllSettings() {
  return prisma.systemSetting.findMany();
}

/**
 * Cached read of the entire settings table.
 * Every mutation calls revalidateTag("settings") → instant site-wide reflection.
 */
export const getAllSettings = unstable_cache(
  fetchAllSettings,
  ["settings-all"],
  { tags: [SETTINGS_TAG], revalidate: false }
);

export async function getSetting<T>(key: string): Promise<T | null> {
  const all = await getAllSettings();
  const row = all.find((s) => s.key === key);
  if (!row) {
    logger.warn({ key }, "settings:key-missing");
    return null;
  }
  return row.value as T;
}

/**
 * Returns a non-business neutral fallback when a key is missing.
 * Business defaults live ONLY in prisma/seed.ts — never here.
 */
export async function getSettingOr<T>(key: string, fallback: T): Promise<T> {
  const value = await getSetting<T>(key);
  return value === null ? fallback : value;
}

// ---------- Write (revalidates tag + audits) ----------

export async function setSetting(input: {
  key: string;
  value: unknown;
  category: Category;
  description?: string | null;
  updatedById?: string | null;
}) {
  const before = await prisma.systemSetting.findUnique({
    where: { key: input.key },
  });

  const after = await prisma.systemSetting.upsert({
    where: { key: input.key },
    update: {
      value: input.value as Prisma.InputJsonValue,
      category: input.category,
      description: input.description ?? null,
      updatedById: input.updatedById ?? null,
    },
    create: {
      key: input.key,
      value: input.value as Prisma.InputJsonValue,
      category: input.category,
      description: input.description ?? null,
      updatedById: input.updatedById ?? null,
    },
  });

  revalidateTag(SETTINGS_TAG);

  await audit({
    actorId: input.updatedById ?? null,
    action: before ? "UPDATE_SETTING" : "CREATE_SETTING",
    target: input.key,
    payload: { before: before?.value ?? null, after: after.value },
  });

  return after;
}

export async function deleteSetting(key: string, updatedById?: string | null) {
  const before = await prisma.systemSetting.findUnique({ where: { key } });
  if (!before) return null;

  await prisma.systemSetting.delete({ where: { key } });
  revalidateTag(SETTINGS_TAG);

  await audit({
    actorId: updatedById ?? null,
    action: "DELETE_SETTING",
    target: key,
    payload: { before: before.value },
  });

  return before;
}

// ---------- Vault (Integration Hub, encrypted at rest) ----------

export { encryptSecret, decryptSecret, maskSecret, isEncrypted } from "./crypto";

/** Reads an INTEGRATION secret: decrypts if stored encrypted. */
export async function readSecret(key: string): Promise<string> {
  const stored = await getSetting<string>(key);
  if (!stored) return "";
  return isEncrypted(stored) ? decryptSecret(stored) : stored;
}
