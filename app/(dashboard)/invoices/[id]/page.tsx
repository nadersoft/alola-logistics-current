export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkPaidButton } from "@/components/bookings/invoice-actions";
import { InvoicePdfButton, type InvoicePdfItem } from "@/components/bookings/invoice-pdf";
import { ChevronLeftIcon } from "lucide-react";

export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const scope = await getScope();
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { customer: true, shipment: true, quote: true },
  });
  if (!invoice) notFound();
  if (!scope.ops && invoice.customerId !== scope.customerId) notFound();

  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const company = getString(map, "company.name", "Alola Logistics");
  const companyCr = getString(map, "company.cr", "");
  const companyAddress = getString(map, "company.address", "");

  const items = (Array.isArray(invoice.items) ? invoice.items : []) as InvoicePdfItem[];
  const currency = invoice.currency;
  const subtotal = toNumber(invoice.subtotal);
  const taxes = toNumber(invoice.taxes);
  const total = toNumber(invoice.total);
  const paid = invoice.status === "PAID";

  const pdfData = {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: formatDate(invoice.createdAt),
    dueDate: formatDate(invoice.dueDate),
    currency,
    subtotal,
    taxes,
    total,
    notes: invoice.notes,
    customerName: invoice.customer.name,
    customerEmail: invoice.customer.email,
    company,
    companyCr,
    companyAddress,
    items,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/invoices" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          All invoices
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {invoice.customer.name} · issued {formatDate(invoice.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={paid ? "default" : invoice.status === "OVERDUE" ? "destructive" : "outline"}>{invoice.status}</Badge>
            <InvoicePdfButton data={pdfData} filename={`${invoice.invoiceNumber}.pdf`} />
            {scope.ops && !paid && invoice.status !== "VOID" ? <MarkPaidButton invoiceId={invoice.id} /> : null}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No line items recorded.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-6 py-2.5">Description</th>
                  <th className="px-6 py-2.5 text-right">Qty</th>
                  <th className="px-6 py-2.5 text-right">Unit price</th>
                  <th className="px-6 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-6 py-2.5">{it.description}</td>
                    <td className="px-6 py-2.5 text-right">{it.qty}</td>
                    <td className="px-6 py-2.5 text-right">{formatCurrency(it.unitPrice, currency)}</td>
                    <td className="px-6 py-2.5 text-right">{formatCurrency(it.amount, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxes</span>
            <span>{formatCurrency(taxes, currency)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-medium">Total</span>
            <span className="font-semibold">{formatCurrency(total, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due date</span>
            <span>{formatDate(invoice.dueDate)}</span>
          </div>
          {invoice.shipment ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipment</span>
              <Link href={`/shipments/${invoice.shipment.id}`} className="text-primary hover:underline">
                {invoice.shipment.shipmentNumber}
              </Link>
            </div>
          ) : null}
          {invoice.notes ? <p className="pt-2 text-sm text-muted-foreground">{invoice.notes}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
