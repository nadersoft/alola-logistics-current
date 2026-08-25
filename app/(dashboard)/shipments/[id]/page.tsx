export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShipmentStatusForm } from "@/components/bookings/shipment-status-form";
import { CreateInvoiceButton } from "@/components/bookings/invoice-actions";
import { ChevronLeftIcon } from "lucide-react";

export const metadata = { title: "Shipment" };

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
  const scope = await getScope();
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      originPort: true,
      destinationPort: true,
      containerType: true,
      carrier: true,
      quote: true,
      invoice: true,
      events: { orderBy: { occurredAt: "asc" } },
    },
  });
  if (!shipment) notFound();
  if (!scope.ops && shipment.customerId !== scope.customerId) notFound();

  const total = toNumber(shipment.totalCost);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/shipments" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          All shipments
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{shipment.shipmentNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {shipment.originPort.code} → {shipment.destinationPort.code} · {shipment.mode} · {shipment.tier}
            </p>
          </div>
          <Badge variant={shipment.status === "DELIVERED" ? "outline" : "default"}>{shipment.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ol className="space-y-0 p-6">
                {shipment.events.map((ev, i) => (
                  <li key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < shipment.events.length - 1 ? <span className="absolute left-[7px] top-4 h-full w-px bg-border" /> : null}
                    <span
                      className={`mt-1 size-3.5 shrink-0 rounded-full border-2 ${
                        i === shipment.events.length - 1 ? "border-primary bg-primary" : "border-border bg-background"
                      }`}
                    />
                    <div>
                      <div className="text-sm font-medium">{ev.status}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(ev.occurredAt)}</div>
                      {ev.location ? <div className="text-xs text-muted-foreground">{ev.location}</div> : null}
                      {ev.note ? <p className="mt-1 text-sm text-muted-foreground">{ev.note}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {scope.ops ? (
            <Card>
              <CardHeader>
                <CardTitle>Update status</CardTitle>
              </CardHeader>
              <CardContent>
                <ShipmentStatusForm shipmentId={shipment.id} current={shipment.status} />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{shipment.customer.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Container</span><span>{shipment.containerType?.code ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span>{shipment.carrier?.name ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ETA</span><span>{formatDate(shipment.eta)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="font-medium">Total</span><span className="font-semibold">{formatCurrency(total, shipment.currency)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(shipment.createdAt)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {shipment.quote ? (
                <Link href={`/quotes/${shipment.quote.id}`} className="block rounded-lg border p-3 hover:border-primary/40">
                  Quote {shipment.quote.quoteNumber}
                </Link>
              ) : null}
              {shipment.invoice ? (
                <Link href={`/invoices/${shipment.invoice.id}`} className="block rounded-lg border p-3 hover:border-primary/40">
                  Invoice {shipment.invoice.invoiceNumber} · <Badge variant={shipment.invoice.status === "PAID" ? "default" : "outline"}>{shipment.invoice.status}</Badge>
                </Link>
              ) : scope.ops ? (
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <CreateInvoiceButton shipmentId={shipment.id} />
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  An invoice will appear here once issued.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
