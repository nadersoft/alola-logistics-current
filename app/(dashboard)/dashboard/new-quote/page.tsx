import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { ClientQuoteForm } from "@/components/quote/client-quote-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Quote" };

export default async function NewQuotePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [settings, ports, , voyages] = await Promise.all([
    getAllSettings(),
    prisma.port.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, include: { country: true } }),
    prisma.containerType.findMany({ where: { isActive: true }, orderBy: { teu: "asc" } }),
    prisma.voyage.findMany({
      where: { isActive: true, showOnCalculator: true, departureDate: { gte: new Date() } },
      orderBy: { departureDate: "asc" },
      include: {
        originPort: { select: { code: true, name: true } },
        destinationPort: { select: { code: true, name: true } },
      },
    }),
  ]);

  const map = toSettingMap(settings);
  const companyName = getString(map, "company.name", "Alola Logistics");
  const companyCr = getString(map, "company.cr", "");
  const companyAddress = getString(map, "company.address", "");
  const defaultOriginCode = getString(map, "defaults.originPortCode", "JED");

  const portOptions = ports.map((p) => ({ code: p.code, name: p.name, type: p.type, countryCode: p.country?.code ?? null }));
  const voyageOptions = voyages.map((v) => ({
    id: v.id,
    vesselName: v.vesselName,
    voyageNumber: v.voyageNumber,
    departureDate: v.departureDate,
    cutOffDate: v.cutOffDate,
    arrivalDate: v.arrivalDate,
    voyageType: v.voyageType,
    transitTime: v.transitTime,
    shippingLine: v.shippingLine,
    originCode: v.originPort.code,
    destinationCode: v.destinationPort.code,
  }));

  const seaCodes = new Set(portOptions.filter((p) => p.type === "SEA").map((p) => p.code));
  const initialOrigin = seaCodes.has(defaultOriginCode) ? defaultOriginCode : (portOptions[0]?.code ?? "");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">طلب سعر جديد / New Quote Request</h1>
        <p className="text-sm text-muted-foreground">
          Choose your route, equipment, and shipping window. Price valid for 24 hours.
        </p>
      </div>
      <ClientQuoteForm
        ports={portOptions}
        voyages={voyageOptions}
        companyName={companyName}
        companyCr={companyCr}
        companyAddress={companyAddress}
        defaultOriginCode={initialOrigin}
        isAuthenticated={true}
      />
    </div>
  );
}
