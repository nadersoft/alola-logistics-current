"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Anchor,
  Boxes,
  Loader2,
  Package,
  Plane,
  Ship,
  ShieldCheck,
  Sparkles,
  Clock,
  Timer,
} from "lucide-react";
import { instantQuote, requestQuote, type QuoteMode, type QuoteResult } from "@/lib/actions/quote";
import { formatNumber } from "@/lib/format";
import { QuotePdfButton, type QuotePdfData } from "@/components/quotes/quote-pdf";

type PortOption = { code: string; name: string; type: string; countryCode: string | null };
type VoyageOption = {
  id: string;
  vesselName: string;
  voyageNumber: string;
  departureDate: Date;
  cutOffDate: Date;
  arrivalDate: Date;
  voyageType: string;
  transitTime: number;
  shippingLine: string;
  originCode: string;
  destinationCode: string;
};

const MODES: { value: QuoteMode; label: string; hint: string }[] = [
  { value: "FCL", label: "FCL", hint: "Full container" },
  { value: "LCL", label: "LCL", hint: "Consolidated" },
  { value: "AIR", label: "AIR", hint: "Air freight" },
];

const SIZE_BY_TYPE: Record<string, string[]> = {
  Dry: ["20GP", "40GP", "40HC"],
  Reefer: ["20RE", "40RE", "40HR"],
  OpenTop: ["20OT", "40OT"],
  FlatRack: ["20FR", "40FR"],
};

const DG_CLASSES = [
  { value: "1", label: "Class 1 - Explosives" },
  { value: "2", label: "Class 2 - Gases" },
  { value: "3", label: "Class 3 - Flammable Liquids" },
  { value: "4", label: "Class 4 - Flammable Solids" },
  { value: "5", label: "Class 5 - Oxidizers" },
  { value: "6", label: "Class 6 - Toxic" },
  { value: "7", label: "Class 7 - Radioactive" },
  { value: "8", label: "Class 8 - Corrosives" },
  { value: "9", label: "Class 9 - Miscellaneous" },
];

function getCountryFromPort(portCode: string, ports?: PortOption[]): string {
  const dbPort = ports?.find((p) => p.code === portCode);
  return dbPort?.countryCode ?? "";
}

export function ClientQuoteForm({
  ports,
  voyages,
  companyName,
  companyCr,
  companyAddress,
  defaultOriginCode,
  isAuthenticated,
}: {
  ports: PortOption[];
  voyages: VoyageOption[];
  companyName: string;
  companyCr: string;
  companyAddress: string;
  defaultOriginCode: string;
  isAuthenticated: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<QuoteMode>("FCL");
  const [origin, setOrigin] = useState(defaultOriginCode || ports[0]?.code || "");
  const [destination, setDestination] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dims] = useState({ length: "100", width: "100", height: "100", weight: "100" });
  const [selectedVoyageId, setSelectedVoyageId] = useState("");

  const [equipmentType, setEquipmentType] = useState("Dry");
  const [selectedSize, setSelectedSize] = useState("20GP");
  const [commodity, setCommodity] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [isFAK, setIsFAK] = useState(true);
  const [cargoWeight, setCargoWeight] = useState("18000");
  const [weightUnit, setWeightUnit] = useState("KGS");
  const [temperature, setTemperature] = useState("0");
  const [tempUnit, setTempUnit] = useState("C");
  const [originCountry, setOriginCountry] = useState(getCountryFromPort(defaultOriginCode, ports));
  const [destinationCountry, setDestinationCountry] = useState("");
  const [isDG, setIsDG] = useState(false);
  const [dgClass, setDgClass] = useState("");
  const [unNumber, setUnNumber] = useState("");

  const [result, setResult] = useState<QuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ number: string; validUntil?: Date } | null>(null);
  const [pending, startTransition] = useTransition();

  const [contact, setContact] = useState({ whatsapp: "967700000000", email: "quotes@alola-logistics.com" });

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setContact(data);
      })
      .catch(() => {});
  }, []);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldRestore = searchParams.get("restorePending") === "1";
    if (!shouldRestore) return;

    const raw = localStorage.getItem("pendingQuote");
    if (!raw) return;

    try {
      const pending = JSON.parse(raw) as {
        origin?: string;
        destination?: string;
        containerType?: string;
        mode?: string;
        total?: number;
        currency?: string;
        timestamp?: number;
      };

      if (Date.now() - (pending.timestamp || 0) > 3_600_000) {
        localStorage.removeItem("pendingQuote");
        return;
      }

      if (pending.origin) setOrigin(pending.origin);
      if (pending.destination) setDestination(pending.destination);
      if (pending.containerType) setSelectedSize(pending.containerType);
      if (pending.mode) setMode(pending.mode as QuoteMode);

      toast.success(
        `تم استعادة عرض السعر ${pending.currency || ""} ${pending.total || ""} - جاري إنشاء الحجز...`
      );

      const timer = setTimeout(async () => {
        try {
          const fd = new FormData();
          fd.set("mode", pending.mode || "FCL");
          fd.set("origin", pending.origin || "");
          fd.set("destination", pending.destination || "");
          fd.set("containerType", pending.containerType || "20GP");
          fd.set("quantity", "1");
          fd.set("equipmentType", "Dry");
          fd.set("equipmentSizes", JSON.stringify([pending.containerType || "20GP"]));
          fd.set("cargoWeight", "18000");
          fd.set("weightUnit", "KGS");
          fd.set("temperature", "0");
          fd.set("tempUnit", "C");
          fd.set("isFAK", "true");
          fd.set("isDG", "false");

          const res = await requestQuote(fd);
          if (res?.ok && res.quoteNumber) {
            localStorage.removeItem("pendingQuote");
            toast.success(`Quote ${res.quoteNumber} saved! Redirecting to booking...`);
            router.push(`/quotes`);
          } else {
            toast.error(res?.error ?? "Failed to restore quote.");
          }
        } catch {
          toast.error("Error restoring quote");
        }
      }, 800);

      return () => clearTimeout(timer);
    } catch {
      localStorage.removeItem("pendingQuote");
    }
  }, [searchParams, router]);

  const seaPorts = ports.filter((p) => p.type === "SEA");
  const airPorts = ports.filter((p) => p.type === "AIR");
  const routePorts = mode === "AIR" ? airPorts : seaPorts;

  const countryOptions = Array.from(
    new Map(
      ports
        .filter((p) => p.countryCode)
        .map((p) => [p.countryCode!, p.countryCode!])
    ).values()
  ).sort();

  const availableSizes = SIZE_BY_TYPE[equipmentType] || SIZE_BY_TYPE.Dry;

  const filteredVoyages = voyages.filter(
    (v) =>
      v.originCode === origin &&
      (!destination || v.destinationCode === destination)
  );

  function switchMode(next: QuoteMode) {
    setMode(next);
    setResult(null);
    setError(null);
    setConfirmed(null);
    setSelectedVoyageId("");
    const opts = next === "AIR" ? airPorts : seaPorts;
    if (!opts.some((p) => p.code === origin)) setOrigin(opts[0]?.code ?? "");
    if (!opts.some((p) => p.code === destination)) setDestination("");
  }

  function handleEquipmentTypeChange(newType: string) {
    setEquipmentType(newType);
    const sizes = SIZE_BY_TYPE[newType] || SIZE_BY_TYPE.Dry;
    setSelectedSize(sizes[0]);
    setResult(null);
    setError(null);
  }

  function handleOriginChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    setOrigin(code);
    setOriginCountry(getCountryFromPort(code, ports));
    setResult(null);
    setError(null);
    setSelectedVoyageId("");
  }

  function handleDestinationChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    setDestination(code);
    setDestinationCountry(getCountryFromPort(code, ports));
    setResult(null);
    setError(null);
    setSelectedVoyageId("");
  }

  function handleSwapPorts() {
    const o = origin;
    const d = destination;
    setOrigin(d);
    setDestination(o);
    setOriginCountry(getCountryFromPort(d, ports));
    setDestinationCountry(getCountryFromPort(o, ports));
    setResult(null);
    setError(null);
    setSelectedVoyageId("");
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("mode", mode);
    fd.set("origin", origin);
    fd.set("destination", destination);
    if (mode === "FCL") {
      fd.set("containerType", selectedSize);
      fd.set("quantity", quantity);
    } else {
      fd.set("containerType", "N/A");
      fd.set("quantity", "1");
      fd.set("length", dims.length);
      fd.set("width", dims.width);
      fd.set("height", dims.height);
      fd.set("weight", dims.weight);
    }
    fd.set("equipmentType", equipmentType);
    fd.set("equipmentSizes", JSON.stringify([selectedSize]));
    fd.set("commodity", commodity);
    fd.set("hsCode", hsCode);
    fd.set("isFAK", String(isFAK));
    fd.set("cargoWeight", cargoWeight);
    fd.set("weightUnit", weightUnit);
    fd.set("temperature", temperature);
    fd.set("tempUnit", tempUnit);
    fd.set("originCountry", originCountry);
    fd.set("destinationCountry", destinationCountry);
    fd.set("isDG", String(isDG));
    fd.set("dgClass", dgClass);
    fd.set("unNumber", unNumber);
    return fd;
  }

  function onQuote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setConfirmed(null);
    startTransition(async () => {
      const res = await instantQuote(buildFormData());
      if (res.ok) {
        setResult(res);
      } else {
        setResult(null);
        setError(res.error ?? "Could not compute a quote right now.");
      }
    });
  }

  async function onSaveAndBook() {
    if (!isAuthenticated || !session?.user) {
      if (result) {
        localStorage.setItem("pendingQuote", JSON.stringify({
          origin: result.originCode,
          destination: result.destinationCode,
          containerType: result.containerTypeCode,
          mode: result.mode,
          total: result.offer?.total,
          currency: result.currency,
          timestamp: Date.now(),
        }));
      }
      router.push("/login?callbackUrl=%2Fdashboard%2Fnew-quote%3FrestorePending%3D1");
      toast.info("Please sign in to complete your booking.");
      return;
    }
    startTransition(async () => {
      const fd = buildFormData();
      if (selectedVoyageId) fd.set("voyageId", selectedVoyageId);
      const res = await requestQuote(fd);
      if (res.ok) {
        setConfirmed({ number: res.quoteNumber!, validUntil: res.validUntil });
        toast.success(`Quote ${res.quoteNumber} saved`);
      } else if (res.signInRequired) {
        toast.error("Please sign in first.");
      } else {
        toast.error(res.error ?? "Could not save the quote.");
      }
    });
  }

  const symbol = result?.currencySymbol || "";
  const selectedVoyage = filteredVoyages.find((v) => v.id === selectedVoyageId);

  const pdfData: QuotePdfData | null = result?.ok && result.offer ? {
    quoteNumber: `INSTANT-${Date.now().toString(36).toUpperCase()}`,
    status: "DRAFT",
    validUntil: result.validUntil
      ? new Date(result.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : undefined,
    currency: result.currency || "USD",
    lane: `${result.originCode} → ${result.destinationCode}`,
    mode,
    tier: "STANDARD",
    base: result.offer.baseTotal,
    surcharges: [
      { label: "BAF", amount: result.offer.surcharges.baf },
      { label: "THC origin", amount: result.offer.surcharges.thcOrigin },
      { label: "THC destination", amount: result.offer.surcharges.thcDestination },
      { label: "Fuel", amount: result.offer.surcharges.fuel },
      { label: "Insurance", amount: result.offer.surcharges.insurance },
      { label: "Service margin", amount: result.offer.surcharges.profit },
      ...(result.offer.surcharges.dg > 0 ? [{ label: "DG Surcharge", amount: result.offer.surcharges.dg }] : []),
      ...(result.offer.surcharges.reefer > 0 ? [{ label: "Reefer Surcharge", amount: result.offer.surcharges.reefer }] : []),
    ],
    total: result.offer.total,
    cargo: [
      { label: "Container type", value: result.containerTypeCode || selectedSize },
      { label: "Quantity", value: String(quantity) },
      { label: "Equipment", value: equipmentType },
      { label: "Chargeable", value: `${formatNumber(result.chargeable ?? 0)} ${result.chargeableLabel || ""}` },
    ],
    customerName: session?.user?.name || "Guest",
    customerEmail: session?.user?.email || null,
    company: companyName,
    companyCr,
    companyAddress,
  } : null;

  return (
    <form onSubmit={onQuote} className="space-y-4">
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row justify-between bg-white p-4 rounded-xl border gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to Instant Quote</h1>
          <p className="text-xs text-gray-500">Find rates and save quotes instantly. Prices valid for 24 hours.</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg border shrink-0">
          <span className="text-xs text-gray-500">Quoting as:</span>
          <p className="text-xs font-bold text-gray-800">{companyName}</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => {
          const Icon = m.value === "FCL" ? Package : m.value === "LCL" ? Boxes : Plane;
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => switchMode(m.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center transition-all ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-md"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300"
              }`}
            >
              <Icon className="size-5" />
              <span className="text-sm font-bold">{m.label}</span>
              <span className={`text-[10px] ${active ? "text-white/70" : "text-gray-400"}`}>{m.hint}</span>
            </button>
          );
        })}
      </div>

      {/* LCL/AIR: Contact card */}
      {mode !== "FCL" ? (
        <div className="bg-white rounded-xl p-12 text-center border shadow-sm">
          <h3 className="text-lg font-bold mb-2 text-gray-800">
            {mode === "LCL" ? "LCL Consolidated Rates" : "Air Freight Rates"}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {mode === "LCL"
              ? "For LCL quotes, please contact our team for best rates per CBM."
              : "For air freight quotes, please contact our team for best rates per kg."}
          </p>
          <div className="flex justify-center gap-4">
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-green-600 transition-colors"
            >
              WhatsApp
            </a>
            <a
              href={`mailto:${contact.email}`}
              className="bg-blue-600 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              {contact.email}
            </a>
          </div>
        </div>
      ) : (
        /* FCL: Two-column layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT CARD - Equipment & Commodity */}
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            <h3 className="font-semibold text-gray-800">Equipment Type / نوع الحاوية</h3>

            <div>
              <label className="text-xs text-gray-500">Select equipment type</label>
              <select
                value={equipmentType}
                onChange={(e) => handleEquipmentTypeChange(e.target.value)}
                className="w-full bg-gray-100 p-3 rounded-lg mt-1 text-sm"
              >
                <option value="Dry">Dry</option>
                <option value="Reefer">Reefer</option>
                <option value="OpenTop">Open Top</option>
                <option value="FlatRack">Flat Rack</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Select Equipment Size</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {availableSizes.map((size) => (
                  <label
                    key={size}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded text-sm cursor-pointer border transition-all ${
                      selectedSize === size
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-100 text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="equipmentSize"
                      value={size}
                      checked={selectedSize === size}
                      onChange={() => {
                        setSelectedSize(size);
                        setResult(null);
                        setError(null);
                      }}
                      className="sr-only"
                    />
                    {size}
                  </label>
                ))}
              </div>
            </div>

            <hr className="my-2" />

            {/* Commodity + DG */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Commodity</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">FAK:</span>
                  <label className="relative inline-flex h-6 w-12 items-center rounded-full bg-black cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFAK}
                      onChange={(e) => setIsFAK(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="peer-checked:translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition" />
                  </label>
                  <span className="text-xs">{isFAK ? "YES" : "NO"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isDG}
                  onChange={(e) => setIsDG(e.target.checked)}
                  className="w-4 h-4 rounded accent-red-600"
                />
                <label className="text-sm font-bold text-red-600">DG Dangerous Goods</label>
              </div>

              {isDG && (
                <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <select
                    value={dgClass}
                    onChange={(e) => setDgClass(e.target.value)}
                    className="w-full bg-white border border-red-200 p-2 rounded text-sm"
                  >
                    <option value="">Select DG Class...</option>
                    {DG_CLASSES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    value={unNumber}
                    onChange={(e) => setUnNumber(e.target.value)}
                    placeholder="UN Number (e.g. UN1203)"
                    className="w-full bg-white border border-red-200 p-2 rounded text-sm"
                  />
                </div>
              )}

              <textarea
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="If known, please type the HS Code or the commodity name here"
                className="w-full bg-gray-100 p-3 rounded-lg h-24 text-sm"
              />
              <input
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                placeholder="HS Code"
                className="w-full bg-gray-100 p-2 rounded text-sm"
              />
            </div>

            <hr className="my-2" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Cargo Weight (per container)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="flex-1 bg-gray-50 border p-2 rounded text-sm"
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="bg-gray-50 border p-2 rounded text-sm"
                  >
                    <option value="KGS">Kgs</option>
                    <option value="LBS">Lbs</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Temperature (per container)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="flex-1 bg-gray-50 border p-2 rounded text-sm"
                  />
                  <select
                    value={tempUnit}
                    onChange={(e) => setTempUnit(e.target.value)}
                    className="bg-gray-50 border p-2 rounded text-sm"
                  >
                    <option value="C">&deg;C</option>
                    <option value="F">&deg;F</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CARD - Shipment Details */}
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
            <h3 className="font-semibold text-gray-800">Shipment Details / تفاصيل الشحنة</h3>

            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div>
                <label className="text-xs text-gray-500">Origin / من ميناء</label>
                <select
                  value={origin}
                  onChange={handleOriginChange}
                  className="w-full bg-gray-100 p-3 rounded-lg mt-1 text-sm"
                >
                  {routePorts.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleSwapPorts}
                className="border rounded-full w-10 h-10 flex items-center justify-center mb-1 hover:bg-gray-100 text-lg"
              >
                &#8644;
              </button>
              <div>
                <label className="text-xs text-gray-500">Destination / الى ميناء</label>
                <select
                  value={destination}
                  onChange={handleDestinationChange}
                  className="w-full bg-gray-100 p-3 rounded-lg mt-1 text-sm"
                >
                  <option value="">Select destination...</option>
                  {routePorts.filter((p) => p.code !== origin).map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Origin Country</label>
                <select
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  className="w-full bg-gray-100 p-3 rounded-lg mt-1 text-sm"
                >
                  <option value="">Select country...</option>
                  {countryOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Destination Country</label>
                <select
                  value={destinationCountry}
                  onChange={(e) => setDestinationCountry(e.target.value)}
                  className="w-full bg-gray-100 p-3 rounded-lg mt-1 text-sm"
                >
                  <option value="">Select country...</option>
                  {countryOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
            </div>

            <hr />

            {/* Voyage Selector */}
            {filteredVoyages.length > 0 && (
              <div>
                <label className="text-sm font-medium">Select Voyage / اختار رحلة</label>
                <div className="mt-2 space-y-2">
                  {filteredVoyages.slice(0, 3).map((v) => {
                    const active = selectedVoyageId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVoyageId(v.id)}
                        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                          active ? "border-blue-600 bg-blue-50 shadow-md" : "border-gray-200 bg-gray-50 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Ship className={`size-5 ${active ? "text-blue-600" : "text-gray-400"}`} />
                          <div>
                            <div className="text-sm font-bold text-gray-800">{v.vesselName} <span className="font-mono text-xs text-gray-500">{v.voyageNumber}</span></div>
                            <div className="text-xs text-gray-500">{v.shippingLine} · {v.voyageType} · {v.transitTime}d transit</div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{new Date(v.departureDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                          <div className="text-[10px]">cut-off: {new Date(v.cutOffDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quantity and Submit */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">الكمية / Quantity</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(String(Math.max(1, parseInt(quantity) - 1)))}
              className="w-8 h-8 border rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-16 text-center border rounded p-1 text-sm font-bold"
            />
            <button
              type="button"
              onClick={() => setQuantity(String(parseInt(quantity) + 1))}
              className="w-8 h-8 border rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              +
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={pending || !origin || !destination || (mode === "FCL" && !selectedSize)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-3 font-medium flex items-center gap-2 disabled:opacity-60 transition-all"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          {pending ? "Calculating..." : "احسب السعر / Get Price"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirmed */}
      {confirmed && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-emerald-600" />
            <div className="text-base font-bold">تم الحفظ / Quote {confirmed.number} saved</div>
          </div>
          <div className="text-sm text-emerald-700/80">
            Our team will confirm availability shortly.
            {confirmed.validUntil ? ` Price locked until ${new Date(confirmed.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.` : ""}
          </div>
          <button onClick={() => router.push("/quotes")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            عروضي / My Quotes
          </button>
        </div>
      )}

      {/* Offer Card */}
      {result?.ok && result.offer && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="font-semibold text-gray-700">
              {result.originCode} &rarr; {result.destinationCode}
              {result.containerTypeCode ? ` · ${result.containerTypeCode}` : ""}
              {result.chargeable !== undefined && (
                <span className="ml-2 text-gray-500">
                  Chargeable: {formatNumber(result.chargeable)} {result.chargeableLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-gray-500">
              <Timer className="size-4" />
              {result.validUntil ? `Valid until ${new Date(result.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Anchor className="size-5 text-blue-600" />
                <span className="text-lg font-bold text-gray-800">STANDARD</span>
              </div>
              {selectedVoyage && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Ship className="size-3.5" />
                  {selectedVoyage.vesselName} ({selectedVoyage.voyageNumber})
                </div>
              )}
            </div>

            <div className="mb-4 text-4xl font-extrabold tracking-tight text-gray-900">
              {symbol}{formatNumber(result.offer.total)}
              <span className="ml-1 text-sm font-medium text-gray-400">{result.currency}</span>
            </div>

            <div className="mb-4 space-y-1.5 border-t pt-4 text-xs">
              {[
                { label: "Base freight", value: result.offer.baseTotal },
                { label: "BAF", value: result.offer.surcharges.baf },
                { label: "THC origin", value: result.offer.surcharges.thcOrigin },
                { label: "THC destination", value: result.offer.surcharges.thcDestination },
                { label: "Fuel", value: result.offer.surcharges.fuel },
                { label: "Insurance", value: result.offer.surcharges.insurance },
                { label: "Service margin", value: result.offer.surcharges.profit },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-gray-500">
                  <span>{row.label}</span>
                  <span className="font-medium text-gray-700">{symbol}{formatNumber(row.value)}</span>
                </div>
              ))}
              {(result.offer.surcharges.dg ?? 0) > 0 && (
                <div className="flex justify-between text-red-600 font-semibold">
                  <span>DG Surcharge</span>
                  <span>{symbol}{formatNumber(result.offer.surcharges.dg)}</span>
                </div>
              )}
              {(result.offer.surcharges.reefer ?? 0) > 0 && (
                <div className="flex justify-between text-blue-600 font-semibold">
                  <span>Reefer Surcharge</span>
                  <span>{symbol}{formatNumber(result.offer.surcharges.reefer)}</span>
                </div>
              )}
            </div>

            {result.freeTimeDays !== undefined && (
              <div className="mb-4 flex items-center gap-1.5">
                <Clock className="size-4 text-blue-600" />
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                  Free Time: {result.freeTimeDays} days
                </span>
              </div>
            )}

            {selectedVoyage && (
              <div className="mb-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Vessel:</strong> {selectedVoyage.vesselName}</div>
                  <div><strong>Voyage:</strong> {selectedVoyage.voyageNumber}</div>
                  <div><strong>Line:</strong> {selectedVoyage.shippingLine}</div>
                  <div><strong>Transit:</strong> {selectedVoyage.transitTime} days</div>
                  <div><strong>Departure:</strong> {new Date(selectedVoyage.departureDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  <div><strong>Cut-off:</strong> {new Date(selectedVoyage.cutOffDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                </div>
              </div>
            )}

            <p className="mb-3 text-center text-[10px] text-gray-400">
              {companyName} · Subject to space availability. Price valid for 24 hours from issue.
            </p>

            <div className="flex gap-3">
              <div className="flex-1">
                {pdfData && (
                  <QuotePdfButton
                    data={pdfData}
                    filename={`quote-${result.originCode}-${result.destinationCode}.pdf`}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={onSaveAndBook}
                disabled={pending}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                title={!isAuthenticated ? "Sign in to book" : "Book this shipment"}
              >
                {pending ? "Saving..." : isAuthenticated ? "طلب حجز / Book Now" : "تسجيل دخول للحجز / Sign in to Book"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
