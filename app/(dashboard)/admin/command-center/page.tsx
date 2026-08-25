import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllSettings } from "@/lib/settings";
import { toSettingMap } from "@/lib/theme";
import { isEncrypted } from "@/lib/crypto";
import { getTwilioCreds, getShip24Key, getWhatsAppKey, getMapboxToken } from "@/lib/integrations";
import { CommandCenterTabs } from "@/components/admin/command-center-tabs";
import type { IntegrationKeyState } from "@/components/admin/integrations-editor";
import type { ProviderStatusRow } from "@/components/admin/status-table";

const KEY_DEFS: { id: IntegrationKeyState["id"]; setting: string }[] = [
  { id: "mapbox", setting: "integration.mapbox.token" },
  { id: "ship24", setting: "integration.ship24.api_key" },
  { id: "twilio.sid", setting: "integration.twilio.sid" },
  { id: "twilio.token", setting: "integration.twilio.token" },
  { id: "twilio.from", setting: "integration.twilio.from" },
  { id: "whatsapp", setting: "integration.whatsapp.key" },
];

export default async function CommandCenterPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const settings = await getAllSettings();
  const map = toSettingMap(settings);

  const keys: IntegrationKeyState[] = KEY_DEFS.map((k) => {
    const stored = map[k.setting];
    const env = getEnvFallback(k.id);
    return {
      id: k.id,
      stored: typeof stored === "string" && (stored.length > 0 || isEncrypted(stored)),
      env,
    };
  });

  const [mapbox, ship24, twilio, whatsapp] = await Promise.all([
    getMapboxToken(),
    getShip24Key(),
    getTwilioCreds(),
    getWhatsAppKey(),
  ]);

  const status: ProviderStatusRow[] = [
    {
      provider: "Mapbox",
      purpose: "Live route map on /track/[ref]",
      source: mapbox.source,
      hint: mapbox.source === "none" ? "Shows static preview until a token is set." : "Token active.",
    },
    {
      provider: "Ship24",
      purpose: "Auto-poll tracking cron (scripts/cron-ship24.ts)",
      source: ship24.source,
      hint: ship24.source === "none" ? "Cron runs in trial mode (console only)." : "API key active.",
    },
    {
      provider: "Twilio",
      purpose: "SMS + WhatsApp alerts on shipment events",
      source: twilio.sid.source === "none" || twilio.token.source === "none" ? "none" : twilio.sid.source,
      hint:
        twilio.sid.source === "none" || twilio.token.source === "none"
          ? "Alerts are logged (no-op) until SID + token are set."
          : "SID + token active.",
    },
    {
      provider: "WhatsApp",
      purpose: "WhatsApp alert channel (key overrides Twilio token)",
      source: whatsapp.source,
      hint: whatsapp.source === "none" ? "Uses Twilio token instead." : "WhatsApp key active.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider Pattern: keys resolve SystemSetting → process.env → console (trial mode). Secrets are encrypted at rest.
        </p>
      </div>
      <CommandCenterTabs keys={keys} status={status} />
    </div>
  );
}

function getEnvFallback(id: IntegrationKeyState["id"]): boolean {
  switch (id) {
    case "mapbox":
      return Boolean(process.env.MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN);
    case "ship24":
      return Boolean(process.env.SHIP24_API_KEY || process.env.TRACKING_API_KEY);
    case "twilio.sid":
      return Boolean(process.env.TWILIO_SID);
    case "twilio.token":
      return Boolean(process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN);
    case "twilio.from":
      return Boolean(process.env.TWILIO_FROM);
    case "whatsapp":
      return Boolean(process.env.WHATSAPP_KEY || process.env.TWILIO_WHATSAPP_KEY);
    case "resend.key":
      return Boolean(process.env.RESEND_API_KEY || process.env.RESEND_KEY);
    case "resend.from":
      return Boolean(process.env.RESEND_FROM || process.env.EMAIL_FROM);
  }
}
