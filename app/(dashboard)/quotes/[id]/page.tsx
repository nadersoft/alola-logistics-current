export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookQuoteButton } from "@/components/bookings/book-quote-button";
import { QuotePdfButton, type QuotePdfData } from "@/components/quotes/quote-pdf";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { ChevronLeftIcon } from "lucide-react";

export const metadata = { title: "Quote" };

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const scope = await getScope();
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      originPort: true,
      destinationPort: true,
      containerType: true,
      shipment: true,
      invoice: true,
    },
  });
  if (!quote) notFound();
  if (!scope.ops && quote.customerId !== scope.customerId) notFound();

  const cargo = (quote.cargo ?? {}) as Record<string, number | string | undefined>;
  const surcharges = (quote.surcharges ?? {}) as Record<string, number | string | undefined>;
  const base = toNumber(quote.baseCost);
  const total = toNumber(quote.total);
  const surchargeTotal = Object.values(surcharges).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0);
  const valid = quote.validUntil ? new Date(quote.validUntil) > new Date() : true;
  const bookable = quote.status === "PENDING" && valid && !quote.shipment;

  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const company = getString(map, "company.name", "Alola Logistics");
  const companyCr = getString(map, "company.cr", "");
  const companyAddress = getString(map, "company.address", "");

  const pdfData: QuotePdfData = {
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    validUntil: quote.validUntil ? formatDate(quote.validUntil) : undefined,
    currency: quote.currency,
    lane: `${quote.originPort?.code ?? "?"} → ${quote.destinationPort?.code ?? "?"}`,
    mode: quote.mode,
    tier: quote.tier,
    base,
    surcharges: Object.entries(surcharges)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => ({ label: k.replace(/([A-Z])/g, " $1").toLowerCase(), amount: v as number })),
    total,
    cargo: Object.entries(cargo)
      .filter(([, v]) => v != null)
      .map(([k, v]) => ({ label: k.replace(/([A-Z])/g, " $1").toLowerCase(), value: typeof v === "number" ? v.toLocaleString() : String(v) })),
    customerName: quote.customer?.name ?? "Walk-in",
    customerEmail: quote.customer?.email,
    company,
    companyCr,
    companyAddress,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/quotes" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          All quotes
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{quote.quoteNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {quote.originPort?.code ?? "—"} → {quote.destinationPort?.code ?? "—"} · {quote.mode} · {quote.tier}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={quote.status === "ACCEPTED" ? "default" : quote.status === "EXPIRED" ? "outline" : "secondary"}>
              {quote.status}
            </Badge>
            <QuotePdfButton data={pdfData} filename={`${quote.quoteNumber}.pdf`} />
            {bookable ? <BookQuoteButton quoteId={quote.id} /> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cargo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Container</span><span>{quote.containerType?.name ?? "—"}</span></div>
              {Object.entries(cargo).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                  <span>{typeof v === "number" ? v.toLocaleString() : (v ?? "—")}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{quote.customer?.name ?? "Walk-in"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valid until</span><span>{quote.validUntil ? formatDate(quote.validUntil) : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{quote.currency}</span></div>
              {quote.shipment ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <Link href={`/shipments/${quote.shipment.id}`} className="text-primary hover:underline">
                    {quote.shipment.shipmentNumber}
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Cost breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base cost</span>
              <span>{formatCurrency(base, quote.currency)}</span>
            </div>
            {Object.entries(surcharges).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span>
                <span>{formatCurrency(typeof v === "number" ? v : 0, quote.currency)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-base">
              <span className="font-medium">Total</span>
              <span className="font-semibold">{formatCurrency(total, quote.currency)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Surcharges sum: {formatCurrency(surchargeTotal, quote.currency)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
