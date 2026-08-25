export const dynamic = "force-dynamic";
import { getAllSettings, readSecret } from "@/lib/settings";
import { toSettingMap } from "@/lib/theme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlugZapIcon } from "lucide-react";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const settings = await getAllSettings();
  const map = toSettingMap(settings);

  const providers = [
    {
      name: "Exchange Rate",
      key: "integration.exchangeRate.apiKey",
      description: "Live FX rates for multi-currency quotes.",
      configured: await readSecret("integration.exchangeRate.apiKey").then((v) => v.length > 0),
    },
    {
      name: "Mapbox",
      key: "integration.mapbox.publicToken",
      description: "Maps and geocoding for tracking views.",
      configured: (map["integration.mapbox.publicToken"] as string)?.length > 0,
    },
    {
      name: "Shipment Tracking",
      key: "integration.tracking.apiKey",
      description: "Real-time courier tracking events.",
      configured: await readSecret("integration.tracking.apiKey").then((v) => v.length > 0),
    },
    {
      name: "Twilio (WhatsApp)",
      key: "integration.twilio.sid",
      description: "WhatsApp/SMS notifications to customers.",
      configured: (map["integration.twilio.sid"] as string)?.length > 0,
    },
    {
      name: "Resend (Email OTP)",
      key: "integration.resend.key",
      description: "Email verification codes for signup.",
      configured: (map["integration.resend.key"] as string)?.length > 0,
    },
    {
      name: "Moyasar Payments",
      key: "integration.moyasar.secretKey",
      description: "Accept card payments on invoices.",
      configured: await readSecret("integration.moyasar.secretKey").then((v) => v.length > 0),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integration Hub</h1>
        <p className="text-sm text-muted-foreground">Connect external services. Secrets are encrypted at rest.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.name}>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-base">{p.name}</CardTitle>
                <CardDescription className="mt-1">{p.description}</CardDescription>
              </div>
              <PlugZapIcon className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge variant={p.configured ? "default" : "outline"}>
                {p.configured ? "Connected" : "Not configured"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
