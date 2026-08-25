export const dynamic = "force-dynamic";
import { ShipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { formatCurrency, formatDate, formatNumber, toNumber } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PackageIcon, ReceiptTextIcon, CircleDollarSignIcon, ArrowUpRightIcon, TicketIcon } from "lucide-react";
import Link from "next/link";
import { QuoteDraftBanner } from "@/components/dashboard/quote-draft-banner";

const ACTIVE_STATUSES: ShipmentStatus[] = [
  ShipmentStatus.CREATED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.CUSTOMS,
];

export default async function DashboardPage() {
  const scope = await getScope();
  const where = scope.customerId ? { customerId: scope.customerId } : {};

  const [shipmentCount, activeShipmentCount, revenueAgg, pendingQuoteCount, recentShipments, myTickets, settings] =
    await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.count({ where: { ...where, status: { in: ACTIVE_STATUSES } } }),
      prisma.shipment.aggregate({ where, _sum: { totalCost: true } }),
      prisma.quote.count({ where: { ...(scope.customerId ? { customerId: scope.customerId } : {}), status: "PENDING" } }),
      prisma.shipment.findMany({
        where,
        take: 6,
        orderBy: { createdAt: "desc" },
        include: { customer: true, originPort: true, destinationPort: true },
      }),
      scope.userEmail
        ? prisma.ticket.count({ where: { customerEmail: scope.userEmail, status: { in: ["OPEN", "IN_PROGRESS"] } } })
        : Promise.resolve(0),
      getAllSettings(),
    ]);

  const map = toSettingMap(settings);
  const currency = getString(map, "defaults.currency", "SAR");

  const stats = scope.ops
    ? [
        { label: "Shipments", value: formatNumber(shipmentCount), icon: PackageIcon, href: "/shipments" },
        { label: "Active now", value: formatNumber(activeShipmentCount), icon: ArrowUpRightIcon, href: "/shipments" },
        { label: "Revenue", value: formatCurrency(revenueAgg._sum.totalCost, currency), icon: CircleDollarSignIcon, href: "/shipments" },
        { label: "Pending quotes", value: formatNumber(pendingQuoteCount), icon: ReceiptTextIcon, href: "/quotes" },
        { label: "Open tickets", value: formatNumber(myTickets), icon: TicketIcon, href: "/support" },
      ]
    : [
        { label: "My shipments", value: formatNumber(shipmentCount), icon: PackageIcon, href: "/shipments" },
        { label: "Active now", value: formatNumber(activeShipmentCount), icon: ArrowUpRightIcon, href: "/shipments" },
        { label: "My pending quotes", value: formatNumber(pendingQuoteCount), icon: ReceiptTextIcon, href: "/quotes" },
        { label: "My open tickets", value: formatNumber(myTickets), icon: TicketIcon, href: "/support" },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {scope.ops ? "Live overview of your freight operation." : "Your shipments and activity at a glance."}
        </p>
      </div>

      <QuoteDraftBanner />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent shipments</CardTitle>
          <CardDescription>{scope.ops ? "Latest bookings across all customers." : "Your most recent bookings."}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentShipments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No shipments yet. {scope.ops ? "Create your first shipment from the Shipments page." : "Request a quote to get started."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5">Number</th>
                    {scope.ops ? <th className="px-6 py-2.5">Customer</th> : null}
                    <th className="px-6 py-2.5">Route</th>
                    <th className="px-6 py-2.5">Status</th>
                    <th className="px-6 py-2.5 text-right">Total</th>
                    <th className="px-6 py-2.5 text-right">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">{s.shipmentNumber}</td>
                      {scope.ops ? <td className="px-6 py-2.5">{s.customer.name}</td> : null}
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
