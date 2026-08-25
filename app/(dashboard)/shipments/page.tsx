export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Shipments" };

export default async function ShipmentsPage() {
  const scope = await getScope();
  const shipments = await prisma.shipment.findMany({
    where: scope.customerId ? { customerId: scope.customerId } : {},
    orderBy: { createdAt: "desc" },
    include: { customer: true, originPort: true, destinationPort: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shipments</h1>
          <p className="text-sm text-muted-foreground">
            {scope.ops ? "Track and manage all freight bookings." : "Track your bookings in real time."}
          </p>
        </div>
        {scope.ops ? (
          <Button disabled>
            <PlusIcon />
            New shipment
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All shipments</CardTitle>
          <CardDescription>{shipments.length} total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {shipments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No shipments yet. Shipment creation is coming in the next milestone.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5">Number</th>
                    <th className="px-6 py-2.5">Customer</th>
                    <th className="px-6 py-2.5">Route</th>
                    <th className="px-6 py-2.5">Status</th>
                    <th className="px-6 py-2.5 text-right">Total</th>
                    <th className="px-6 py-2.5 text-right">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">
                        <Link href={`/shipments/${s.id}`} className="hover:underline">
                          {s.shipmentNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-2.5">{s.customer.name}</td>
                      <td className="px-6 py-2.5 text-muted-foreground">
                        {s.originPort.code} → {s.destinationPort.code}
                      </td>
                      <td className="px-6 py-2.5">
                        <Badge variant={s.status === "DELIVERED" ? "outline" : "secondary"}>{s.status}</Badge>
                      </td>
                      <td className="px-6 py-2.5 text-right">
                        {s.totalCost ? formatCurrency(toNumber(s.totalCost), s.currency) : "—"}
                      </td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground">{formatDate(s.createdAt)}</td>
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
