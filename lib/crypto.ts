import crypto from "crypto";

/**
 * Pure AES-256-GCM secret helpers — NO server-only / next imports, so the
 * standalone crons (tsx) can reuse the exact same vault used by the app.
 * The encryption key is read from SETTINGS_ENCRYPTION_KEY (base64).
 */

export function getEncryptionKey(): Buffer {
  const b64 = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!b64) throw new Error("SETTINGS_ENCRYPTION_KEY is required");
  return Buffer.from(b64, "base64");
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith('{"v":1,');
}

/** AES-256-GCM encrypt → JSON { v, iv, tag, data }. */
export function encryptSecret(plain: string, key = getEncryptionKey()): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64"),
  });
}

export function decryptSecret(payload: string, key = getEncryptionKey()): string {
  const parsed = JSON.parse(payload) as { v?: number; iv: string; tag: string; data: string };
  if (!parsed.iv || !parsed.tag || !parsed.data) return payload;
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(parsed.data, "base64")), decipher.final()]).toString("utf8");
}

export function maskSecret(secret: string): string {
  if (!secret) return "";
  return secret.length <= 4 ? "****" : `****${secret.slice(-4)}`;
}
