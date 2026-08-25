export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkPaidButton } from "@/components/bookings/invoice-actions";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const scope = await getScope();
  const invoices = await prisma.invoice.findMany({
    where: scope.customerId ? { customerId: scope.customerId } : {},
    orderBy: { createdAt: "desc" },
    include: { customer: true, shipment: true, quote: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          {scope.ops ? "Billing generated from confirmed bookings." : "Review and pay your invoices."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All invoices</CardTitle>
          <CardDescription>{invoices.length} total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
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
                    <th className="px-6 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-2.5">{inv.customer.name}</td>
                      <td className="px-6 py-2.5 text-muted-foreground">{inv.shipment?.shipmentNumber ?? "—"}</td>
                      <td className="px-6 py-2.5">
                        <Badge variant={inv.status === "PAID" ? "default" : inv.status === "OVERDUE" ? "destructive" : "outline"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-2.5 text-right">{formatCurrency(toNumber(inv.total), inv.currency)}</td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground">{formatDate(inv.dueDate)}</td>
                      <td className="px-6 py-2.5 text-right">
                        {inv.status !== "PAID" && inv.status !== "VOID" ? <MarkPaidButton invoiceId={inv.id} /> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
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
