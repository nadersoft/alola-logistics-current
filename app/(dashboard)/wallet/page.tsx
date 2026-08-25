export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatCurrency, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
const WalletExport = (props: any) => null;
export const metadata = { title: "Finance Wallet" };

const OUTSTANDING_STATUSES = ["DRAFT", "SENT", "OVERDUE"] as const;

export default async function WalletPage() {
  const scope = await getScope();
  const invoices = await prisma.invoice.findMany({
    where: scope.customerId ? { customerId: scope.customerId } : {},
    orderBy: { createdAt: "desc" },
    include: { customer: true, shipment: true },
  });

  const outstanding = invoices.filter((i) => (OUTSTANDING_STATUSES as readonly string[]).includes(i.status));
  const paid = invoices.filter((i) => i.status === "PAID");

  const balance = outstanding.reduce((s, i) => s + toNumber(i.total), 0);
  const paidTotal = paid.reduce((s, i) => s + toNumber(i.total), 0);
  const allTotal = invoices.reduce((s, i) => s + toNumber(i.total), 0);
  const currency = invoices[0]?.currency ?? "SAR";

  const rows = invoices.map((i) => ({
    number: i.invoiceNumber,
    customer: i.customer.name,
    shipment: i.shipment?.shipmentNumber ?? "—",
    status: i.status,
    total: toNumber(i.total),
    currency: i.currency,
    dueDate: i.dueDate ? i.dueDate.toISOString().slice(0, 10) : "—",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance Wallet</h1>
          <p className="text-sm text-muted-foreground">
            {scope.ops ? "Full portfolio of customer receivables." : "Your account balance and payment history."}
          </p>
        </div>
        {rows.length > 0 ? <WalletExport rows={rows} /> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Current balance</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(balance, currency)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Outstanding invoices</CardDescription>
            <CardTitle className="text-3xl">{outstanding.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Paid to date</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(paidTotal, currency)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement</CardTitle>
          <CardDescription>
            {rows.length} invoices · {allTotal > 0 ? `${formatCurrency(paidTotal, currency)} paid of ${formatCurrency(allTotal, currency)}` : "no activity yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No invoices yet. Invoices are generated automatically when a quote is booked, or manually from a shipment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5">Number</th>
                    <th className="px-6 py-2.5">Customer</th>
                    <th className="px-6 py-2.5">Shipment</th>
                    <th className="px-6 py-2.5">Status</th>
                    <th className="px-6 py-2.5 text-right">Total</th>
                    <th className="px-6 py-2.5 text-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inv) => (
                    <tr key={inv.number} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">
                        <Link href={`/invoices/${inv.number}`} className="hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-6 py-2.5">{inv.customer}</td>
                      <td className="px-6 py-2.5 text-muted-foreground">{inv.shipment}</td>
                      <td className="px-6 py-2.5">
                        <Badge variant={inv.status === "PAID" ? "default" : inv.status === "OVERDUE" ? "destructive" : "outline"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-2.5 text-right">{formatCurrency(inv.total, inv.currency)}</td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground">{inv.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
