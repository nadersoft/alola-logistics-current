/**
 * Integration key registry (shared — safe for client + server + server actions).
 * The actual keys are stored encrypted in SystemSetting; this module only
 * describes WHICH keys exist, their labels, and how they're stored.
 */

export type IntegrationKeyId =
  | "mapbox"
  | "ship24"
  | "twilio.sid"
  | "twilio.token"
  | "twilio.from"
  | "whatsapp"
  | "resend.key"
  | "resend.from";

export type IntegrationKeyDef = {
  id: IntegrationKeyId;
  setting: string;
  label: string;
  secret: boolean;
  placeholder: string;
};

export const INTEGRATION_KEYS: Record<IntegrationKeyId, IntegrationKeyDef> = {
  mapbox: { id: "mapbox", setting: "integration.mapbox.token", label: "Mapbox GL Token", secret: true, placeholder: "pk.eyJ1Ijoi..." },
  ship24: { id: "ship24", setting: "integration.ship24.api_key", label: "Ship24 API Key", secret: true, placeholder: "ship24_..." },
  "twilio.sid": { id: "twilio.sid", setting: "integration.twilio.sid", label: "Twilio Account SID", secret: true, placeholder: "AC..." },
  "twilio.token": { id: "twilio.token", setting: "integration.twilio.token", label: "Twilio Auth Token", secret: true, placeholder: "••••" },
  "twilio.from": { id: "twilio.from", setting: "integration.twilio.from", label: "Twilio Sender", secret: false, placeholder: "+14155552671 / whatsapp:+14155552671" },
  whatsapp: { id: "whatsapp", setting: "integration.whatsapp.key", label: "WhatsApp Business Key", secret: true, placeholder: "EAA..." },
  "resend.key": { id: "resend.key", setting: "integration.resend.key", label: "Resend API Key (email OTP)", secret: true, placeholder: "re_..." },
  "resend.from": { id: "resend.from", setting: "integration.resend.from", label: "Resend sender email", secret: false, placeholder: "no-reply@alola.example" },
};

export const INTEGRATION_KEY_IDS = Object.keys(INTEGRATION_KEYS) as IntegrationKeyId[];
