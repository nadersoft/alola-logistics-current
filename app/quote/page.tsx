import Link from "next/link";
import { ArrowLeftIcon, ShieldCheck } from "lucide-react";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import { ClientQuoteForm } from "@/components/quote/client-quote-form";

export const metadata = { title: "Instant Quote" };

export const dynamic = "force-dynamic";

export default async function QuotePage() {
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
    <main className="min-h-screen bg-gray-50 text-gray-800 antialiased">
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 to-blue-900 pb-16 pt-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-16 size-80 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-20 bottom-0 size-72 rounded-full bg-white/5 blur-3xl" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white">
            <ArrowLeftIcon className="size-4" />
            Back to home
          </Link>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <ShieldCheck className="size-4 text-emerald-300" />
            Live rates from your database
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">احسب سعر شحنتك</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Select your route and equipment. Get a transparent single price in seconds.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <ClientQuoteForm
          ports={portOptions}
          voyages={voyageOptions}
          companyName={companyName}
          companyCr={companyCr}
          companyAddress={companyAddress}
          defaultOriginCode={initialOrigin}
          isAuthenticated={false}
        />
        <p className="mt-10 text-center text-xs text-gray-400">
          {companyName} · Digital freight forwarding
        </p>
      </section>
    </main>
  );
}
