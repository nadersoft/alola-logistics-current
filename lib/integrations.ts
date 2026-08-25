import "server-only";
import { getAllSettings, readSecret } from "./settings";
import { toSettingMap } from "./theme";
import { logger } from "./log";

/**
 * Integration Provider Pattern (Phase 3).
 *
 * Every third-party key is resolved in this order:
 *   1. SystemSetting  (editable from Command Center → Integrations)
 *   2. process.env    (fallback for self-hosted deploys)
 *   3. console print  (trial mode — never breaks the site)
 *
 * Keys stored in SystemSetting are encrypted at rest (AES-256-GCM).
 */

export type IntegrationSource = "setting" | "env" | "none";

export type ResolvedIntegration = { value: string; source: IntegrationSource };

export async function resolveIntegration(opts: {
  id: string;
  settingKeys: string[];
  envKeys: string[];
  secret?: boolean;
}): Promise<ResolvedIntegration> {
  const all = await getAllSettings();
  const map = toSettingMap(all);

  for (const key of opts.settingKeys) {
    const raw = map[key];
    if (typeof raw === "string" && raw.length > 0) {
      const value = opts.secret ? await readSecret(key) : raw;
      if (value.length > 0) {
        logger.info({ integration: opts.id, source: "setting", key }, "integration:resolved");
        return { value, source: "setting" };
      }
    }
  }

  for (const envKey of opts.envKeys) {
    const value = process.env[envKey];
    if (value && value.length > 0) {
      logger.info({ integration: opts.id, source: "env", key: envKey }, "integration:resolved");
      return { value, source: "env" };
    }
  }

  logger.warn(
    { integration: opts.id, settingKeys: opts.settingKeys, envKeys: opts.envKeys },
    "integration:missing — trial mode (set a key in Command Center → Integrations)"
  );
  return { value: "", source: "none" };
}

// ---------- Concrete providers ----------

export function getMapboxToken(): Promise<ResolvedIntegration> {
  return resolveIntegration({
    id: "mapbox",
    settingKeys: ["integration.mapbox.token", "integration.mapbox.publicToken"],
    envKeys: ["MAPBOX_TOKEN", "NEXT_PUBLIC_MAPBOX_TOKEN", "MAPBOX_PUBLIC_TOKEN"],
  });
}

export function getShip24Key(): Promise<ResolvedIntegration> {
  return resolveIntegration({
    id: "ship24",
    settingKeys: ["integration.ship24.api_key", "integration.tracking.apiKey"],
    envKeys: ["SHIP24_API_KEY", "TRACKING_API_KEY"],
    secret: true,
  });
}

export async function getTwilioCreds(): Promise<{
  sid: ResolvedIntegration;
  token: ResolvedIntegration;
  from: ResolvedIntegration;
}> {
  const [sid, token, from] = await Promise.all([
    resolveIntegration({
      id: "twilio.sid",
      settingKeys: ["integration.twilio.sid"],
      envKeys: ["TWILIO_SID"],
      secret: true,
    }),
    resolveIntegration({
      id: "twilio.token",
      settingKeys: ["integration.twilio.token", "integration.twilio.authToken"],
      envKeys: ["TWILIO_AUTH_TOKEN", "TWILIO_TOKEN"],
      secret: true,
    }),
    resolveIntegration({
      id: "twilio.from",
      settingKeys: ["integration.twilio.from"],
      envKeys: ["TWILIO_FROM"],
    }),
  ]);
  return { sid, token, from };
}

export function getWhatsAppKey(): Promise<ResolvedIntegration> {
  return resolveIntegration({
    id: "whatsapp",
    settingKeys: ["integration.whatsapp.key"],
    envKeys: ["WHATSAPP_KEY", "TWILIO_WHATSAPP_KEY"],
    secret: true,
  });
}

export function getResendCreds(): Promise<{
  key: ResolvedIntegration;
  from: ResolvedIntegration;
}> {
  const [key, from] = [resolveIntegration({
    id: "resend.key",
    settingKeys: ["integration.resend.key"],
    envKeys: ["RESEND_API_KEY", "RESEND_KEY"],
    secret: true,
  }), resolveIntegration({
    id: "resend.from",
    settingKeys: ["integration.resend.from"],
    envKeys: ["RESEND_FROM", "EMAIL_FROM"],
  })];
  return Promise.all([key, from]).then(([k, f]) => ({ key: k, from: f }));
}

/** Whether the given resolved key is actually usable. */
export function isConfigured(r: ResolvedIntegration): boolean {
  return r.source !== "none" && r.value.length > 0;
}
