import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Anchor, Check, MapPin, PackageSearch, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { getAllSettings } from "@/lib/settings";
import { getJson, getString, toSettingMap } from "@/lib/theme";
import { normalizeLocale, t } from "@/lib/i18n";
import { getMapboxToken } from "@/lib/integrations";
import { TrackingMap } from "@/components/track/tracking-map";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS", "DELIVERED"] as const;
const STATUS_LABEL: Record<string, string> = {
  CREATED: "Booking Received",
  PICKED_UP: "Cargo Picked Up",
  IN_TRANSIT: "In Transit",
  CUSTOMS: "Customs Clearance",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  CREATED: "bg-sky-100 text-sky-700",
  PICKED_UP: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-emerald-100 text-emerald-700",
  CUSTOMS: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default async function TrackPage({ params }: { params: { ref: string } }) {
  const ref = decodeURIComponent(params.ref).toUpperCase();

  const [shipment, settings, mapbox] = await Promise.all([
    prisma.shipment.findFirst({
      where: { shipmentNumber: ref },
      include: {
        originPort: true,
        destinationPort: true,
        carrier: true,
        containerType: true,
        customer: true,
        events: { orderBy: { occurredAt: "asc" } },
      },
    }),
    getAllSettings(),
    getMapboxToken(),
  ]);

  if (!shipment) {
    notFound();
  }

  const map = toSettingMap(settings);
  const cookieLocale = cookies().get("alola_locale")?.value;
  const locale = normalizeLocale(cookieLocale ?? getString(map, "defaults.language", "en"));
  const portGeo = getJson<Record<string, [number, number]>>(map, "tracking.portGeo", {});
  const originGeo = portGeo[shipment.originPort.code];
  const destinationGeo = portGeo[shipment.destinationPort.code];

  const idx = STATUS_ORDER.indexOf(shipment.status as (typeof STATUS_ORDER)[number]);
  const isCancelled = shipment.status === "CANCELLED";
  const isDone = shipment.status === "DELIVERED";

  const milestones = STATUS_ORDER.slice(0, isCancelled ? idx : idx + 1).map((st, i) => {
    const ev = shipment.events.find((e) => e.status === st);
    return {
      key: st,
      label: STATUS_LABEL[st],
      completed: isCancelled ? false : i < idx || isDone,
      current: !isCancelled && !isDone && i === idx,
      location:
        ev?.location ??
        (i === 0 ? shipment.originPort.name : i === STATUS_ORDER.length - 1 ? shipment.destinationPort.name : ""),
      date: ev?.occurredAt ?? (i === 0 ? shipment.createdAt : null),
      note: ev?.note ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-[var(--alola-slate)] px-4 py-10 text-gray-800 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline">
            <Anchor className="size-4" />
            {t(locale, "track.home")}
          </Link>
          <Link href="/quote" className="text-sm font-medium text-[var(--primary)] hover:underline">
            {t(locale, "track.getQuote")}
          </Link>
          <LocaleSwitcher locale={locale} />
        </div>

        <div className="overflow-hidden rounded-3xl border bg-white shadow-xl">
          <div className="border-b bg-gradient-to-r from-[var(--primary)]/5 to-transparent p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-1 flex items-center gap-3">
                  <h1 className="text-xl font-bold text-[var(--alola-dark)] sm:text-2xl">
                    {locale === "ar" ? "الحجز" : "Booking"} <span className="font-mono">{shipment.shipmentNumber}</span>
                  </h1>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[shipment.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABEL[shipment.status] ?? shipment.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {shipment.carrier ? `${shipment.carrier.name} • ` : ""}
                  {shipment.originPort.name} → {shipment.destinationPort.name}
                  {shipment.containerType ? ` • ${shipment.containerType.code}` : ""}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm text-gray-500">
                  {isDone ? t(locale, "track.delivered") : t(locale, "track.eta")}
                </div>
                <div className="text-lg font-bold text-[var(--alola-dark)]">
                  {shipment.eta ? formatDate(shipment.eta) : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {isCancelled ? (
              <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-5 text-sm text-red-700">
                <X className="size-5" />
                {t(locale, "track.cancelled")}
              </div>
            ) : (
              <div className="relative">
                <div className="absolute bottom-8 left-4 top-8 hidden w-0.5 bg-gray-100 sm:block" />
                <div className="space-y-6">
                  {milestones.map((m) => (
                    <div key={m.key} className="flex items-start gap-4 sm:gap-6">
                      <div className="relative z-10 shrink-0">
                        <div
                          className={`flex size-8 items-center justify-center rounded-full ${
                            m.completed
                              ? "bg-emerald-500 text-white"
                              : m.current
                                ? "bg-[var(--primary)] text-white ring-4 ring-[var(--primary)]/20"
                                : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {m.completed ? (
                            <Check className="size-4" />
                          ) : m.current ? (
                            <span className="animate-pulse-ring relative block size-4 bg-white" />
                          ) : (
                            <span className="size-2 rounded-full bg-gray-300" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 border-b border-gray-50 pb-6 last:border-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h4 className={`font-semibold ${m.completed || m.current ? "text-[var(--alola-dark)]" : "text-gray-400"}`}>
                              {m.label}
                              {m.current && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                                    <span className="relative flex h-2 w-2">
                                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--primary)] opacity-75" />
                                      <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
                                    </span>
                                    {t(locale, "track.current")}
                                  </span>
                              )}
                            </h4>
                            <p className="mt-0.5 text-sm text-gray-500">{m.location || m.note || ""}</p>
                          </div>
                          <span className="font-mono text-sm text-gray-400">{m.date ? formatDate(m.date) : ""}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {!isCancelled && originGeo && destinationGeo ? (
          <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--alola-dark)]">
                <MapPin className="size-4 text-[var(--primary)]" />
                {t(locale, "track.liveMap")}
              </h3>
              {shipment.trackingNumber ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs text-gray-500">
                  {shipment.trackingProvider?.toUpperCase() ?? "TRACK"} • {shipment.trackingNumber}
                </span>
              ) : null}
            </div>
            <TrackingMap
              origin={originGeo}
              destination={destinationGeo}
              mapboxToken={mapbox.value}
              originLabel={shipment.originPort.name}
              destinationLabel={shipment.destinationPort.name}
              locale={locale}
            />
          </div>
        ) : null}

        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border bg-white p-5 text-sm text-gray-500 sm:flex-row">
          <span className="flex items-center gap-2">
            <PackageSearch className="size-4 text-[var(--primary)]" />
            {t(locale, "track.trackAnother")}
          </span>
          <Link href="/#tracking" className="font-medium text-[var(--primary)] hover:underline">
            {t(locale, "track.trackAnotherLink")}
          </Link>
        </div>
      </div>
    </main>
  );
}
