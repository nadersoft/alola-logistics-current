"use server";
import { revalidateTag } from "next/cache";
import { Category } from "@prisma/client";
import { auth } from "@/lib/auth";
import { setSetting, encryptSecret } from "@/lib/settings";
import { INTEGRATION_KEYS, type IntegrationKeyId } from "@/lib/integration-keys";
import { getMapboxToken, getShip24Key, getTwilioCreds, getWhatsAppKey, type IntegrationSource } from "@/lib/integrations";
import { audit, logger } from "@/lib/log";

export type TestIntegrationKeyState = { ok: boolean; message: string; source: IntegrationSource };

async function httpProbe(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  return { ok: res.ok, status: res.status };
}

export async function testIntegrationKey(keyId: IntegrationKeyId): Promise<TestIntegrationKeyState> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { ok: false, message: "Unauthorized", source: "none" };
  }

  try {
    switch (keyId) {
      case "mapbox": {
        const key = await getMapboxToken();
        if (!key.value) return { ok: false, message: "No Mapbox token configured (trial mode).", source: "none" };
        const res = await httpProbe(`https://api.mapbox.com/tokens/v2?access_token=${encodeURIComponent(key.value)}`);
        if (res.ok) return { ok: true, message: "Mapbox token is valid.", source: key.source };
        return { ok: false, message: `Mapbox rejected the token (HTTP ${res.status}).`, source: key.source };
      }
      case "ship24": {
        const key = await getShip24Key();
        if (!key.value) return { ok: false, message: "No Ship24 key configured (trial mode).", source: "none" };
        const res = await httpProbe("https://api.ship24.com/public/v1/trackers?page=1&limit=1", {
          headers: { Authorization: `Bearer ${key.value}`, Accept: "application/json" },
        });
        if (res.ok) return { ok: true, message: "Ship24 API key is valid.", source: key.source };
        if (res.status === 401 || res.status === 403) return { ok: false, message: "Ship24 rejected the key (HTTP 401/403).", source: key.source };
        return { ok: false, message: `Ship24 returned HTTP ${res.status}.`, source: key.source };
      }
      case "twilio.sid":
      case "twilio.token": {
        const creds = await getTwilioCreds();
        if (!creds.sid.value || !creds.token.value) {
          return { ok: false, message: "Need both SID and Auth Token to test Twilio.", source: "none" };
        }
        const basic = Buffer.from(`${creds.sid.value}:${creds.token.value}`).toString("base64");
        const res = await httpProbe(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(creds.sid.value)}.json`, {
          headers: { Authorization: `Basic ${basic}` },
        });
        if (res.ok) return { ok: true, message: "Twilio credentials are valid.", source: creds.sid.source };
        if (res.status === 401) return { ok: false, message: "Twilio rejected the credentials (HTTP 401).", source: creds.sid.source };
        return { ok: false, message: `Twilio returned HTTP ${res.status}.`, source: creds.sid.source };
      }
      case "twilio.from": {
        const creds = await getTwilioCreds();
        if (!creds.from.value) return { ok: false, message: "No sender number set.", source: "none" };
        return { ok: true, message: "Sender number is set (no remote check).", source: creds.from.source };
      }
      case "whatsapp": {
        const key = await getWhatsAppKey();
        if (key.value) {
          const res = await httpProbe(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(key.value)}`);
          if (res.ok) return { ok: true, message: "WhatsApp Business key is valid.", source: key.source };
          return { ok: false, message: `WhatsApp Graph API rejected the key (HTTP ${res.status}).`, source: key.source };
        }
        const creds = await getTwilioCreds();
        if (creds.sid.value && creds.token.value) {
          return { ok: true, message: "Uses Twilio WhatsApp — test via the Twilio row.", source: creds.sid.source };
        }
        return { ok: false, message: "No WhatsApp key or Twilio credentials configured (trial mode).", source: "none" };
      }
      default:
        return { ok: false, message: "Unknown key.", source: "none" };
    }
  } catch (err) {
    logger.error({ err, key: keyId }, "integration:test-failed");
    return { ok: false, message: "Connection failed (network/timeout).", source: "none" };
  } finally {
    void audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "integration:test",
      target: keyId,
    });
  }
}

export type SaveIntegrationKeyState = { ok: boolean; error?: string; key?: IntegrationKeyId };

export async function saveIntegrationKey(
  keyId: IntegrationKeyId,
  value: string
): Promise<SaveIntegrationKeyState> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { ok: false, error: "Unauthorized", key: keyId };
  }
  const def = INTEGRATION_KEYS[keyId];
  if (!def) return { ok: false, error: "Unknown key", key: keyId };

  const clean = value.trim();
  await setSetting({
    key: def.setting,
    value: def.secret && clean ? encryptSecret(clean) : clean,
    category: Category.INTEGRATION,
    description: `${def.label} (Command Center → Integrations)`,
    updatedById: session.user.id,
  });
  revalidateTag("settings");
  return { ok: true, key: keyId };
}

export async function clearIntegrationKey(keyId: IntegrationKeyId): Promise<SaveIntegrationKeyState> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) {
    return { ok: false, error: "Unauthorized", key: keyId };
  }
  const def = INTEGRATION_KEYS[keyId];
  if (!def) return { ok: false, error: "Unknown key", key: keyId };
  await setSetting({
    key: def.setting,
    value: "",
    category: Category.INTEGRATION,
    description: `${def.label} (Command Center → Integrations)`,
    updatedById: session.user.id,
  });
  revalidateTag("settings");
  return { ok: true, key: keyId };
}
