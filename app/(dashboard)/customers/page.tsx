export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { shipments: true, quotes: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground">Your shippers and consignees.</p>
        </div>
        <Button disabled>
          <PlusIcon />
          New customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All customers</CardTitle>
          <CardDescription>{customers.length} total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No customers yet. Customer management is coming in the next milestone.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5">Name</th>
                    <th className="px-6 py-2.5">Email</th>
                    <th className="px-6 py-2.5">Phone</th>
                    <th className="px-6 py-2.5 text-right">Shipments</th>
                    <th className="px-6 py-2.5 text-right">Quotes</th>
                    <th className="px-6 py-2.5 text-right">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">{c.name}</td>
                      <td className="px-6 py-2.5">{c.email ?? "—"}</td>
                      <td className="px-6 py-2.5">{c.phone ?? "—"}</td>
                      <td className="px-6 py-2.5 text-right">{c._count.shipments}</td>
                      <td className="px-6 py-2.5 text-right">{c._count.quotes}</td>
                      <td className="px-6 py-2.5 text-right text-muted-foreground">{formatDate(c.createdAt)}</td>
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
