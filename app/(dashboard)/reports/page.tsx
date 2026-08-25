export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportsFilter } from "@/components/reports/reports-filter";
import { ReportsExport, type ReportExportData } from "@/components/reports/reports-export";
import { CircleDollarSignIcon, PackageIcon, TrendingUpIcon, ReceiptTextIcon, ShipWheelIcon } from "lucide-react";

export const metadata = { title: "Reports" };

type SearchParams = { [key: string]: string | string[] | undefined };

function fmtK(v: number, currency: string): string {
  if (v >= 1_000_000) return formatCurrency(v, currency);
  if (v >= 1_000) return `${formatCurrency(v, currency)}`;
  return formatCurrency(v, currency);
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const scope = await getScope();
  if (!scope.ops) redirect("/dashboard");

  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const currency = getString(map, "defaults.currency", "SAR");

  const now = new Date();
  const from = typeof searchParams.from === "string" && searchParams.from ? new Date(`${searchParams.from}T00:00:00`) : new Date(now.getTime() - 90 * 86400000);
  const toRaw = typeof searchParams.to === "string" && searchParams.to ? new Date(`${searchParams.to}T23:59:59`) : new Date(now);
  const to = isNaN(toRaw.getTime()) ? new Date(now) : toRaw;
  const mode = typeof searchParams.mode === "string" && searchParams.mode ? searchParams.mode : undefined;
  const status = typeof searchParams.status === "string" && searchParams.status ? searchParams.status : undefined;

  const exchange = await prisma.exchangeRate.findMany();
  const rateOf = new Map(exchange.map((e) => [e.currency, toNumber(e.rate)]));

  const [shipments, quotes, invoices] = await Promise.all([
    prisma.shipment.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        ...(mode ? { mode: mode as never } : {}),
        ...(status ? { status: status as never } : {}),
      },
      include: { customer: true, originPort: true, destinationPort: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    prisma.quote.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { status: true },
    }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: from, lte: to }, status: { in: ["SENT", "OVERDUE", "DRAFT"] } },
      include: { customer: true },
    }),
  ]);

  const toDisplay = (amount: number, fromCurrency: string): number =>
    (rateOf.get(fromCurrency) ?? 1) * amount;

  const revenueOf = (s: (typeof shipments)[number]): number =>
    s.status === "CANCELLED" ? 0 : toDisplay(toNumber(s.totalCost), s.currency);

  const totalRevenue = shipments.reduce((sum, s) => sum + revenueOf(s), 0);
  const activeCount = shipments.filter((s) => ["CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS"].includes(s.status)).length;

  const monthlyMap = new Map<string, { revenue: number; count: number }>();
  for (const s of shipments) {
    const key = s.createdAt.toISOString().slice(0, 7);
    const cur = monthlyMap.get(key) ?? { revenue: 0, count: 0 };
    cur.revenue += revenueOf(s);
    cur.count += 1;
    monthlyMap.set(key, cur);
  }
  const monthly = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, v]) => ({ month, revenue: Math.round(v.revenue * 100) / 100, count: v.count }));

  const byModeMap = new Map<string, { count: number; revenue: number }>();
  const byTierMap = new Map<string, { count: number; revenue: number }>();
  const byStatusMap = new Map<string, { count: number }>();
  const byLaneMap = new Map<string, { count: number; revenue: number }>();
  for (const s of shipments) {
    const modeKey = s.mode;
    const byMode = byModeMap.get(modeKey) ?? { count: 0, revenue: 0 };
    byMode.count += 1;
    byMode.revenue += revenueOf(s);
    byModeMap.set(modeKey, byMode);

    const byTier = byTierMap.get(s.tier) ?? { count: 0, revenue: 0 };
    byTier.count += 1;
    byTier.revenue += revenueOf(s);
    byTierMap.set(s.tier, byTier);

    const byStatus = byStatusMap.get(s.status) ?? { count: 0 };
    byStatus.count += 1;
    byStatusMap.set(s.status, byStatus);

    const lane = `${s.originPort?.code ?? "?"} → ${s.destinationPort?.code ?? "?"}`;
    const byLane = byLaneMap.get(lane) ?? { count: 0, revenue: 0 };
    byLane.count += 1;
    byLane.revenue += revenueOf(s);
    byLaneMap.set(lane, byLane);
  }
  const byMode = [...byModeMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([key, v]) => ({ key, ...v }));
  const byTier = [...byTierMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue).map(([key, v]) => ({ key, ...v }));
  const byStatus = [...byStatusMap.entries()].sort((a, b) => b[1].count - a[1].count).map(([key, v]) => ({ key, ...v }));
  const byLane = [...byLaneMap.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8).map(([key, v]) => ({ key, ...v }));

  const customerRevenue = new Map<string, { count: number; revenue: number }>();
  for (const s of shipments) {
    const name = s.customer?.name ?? "Unknown";
    const cur = customerRevenue.get(name) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += revenueOf(s);
    customerRevenue.set(name, cur);
  }
  const topCustomers = [...customerRevenue.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8).map(([key, v]) => ({ key, ...v }));

  const invoicesOutstanding = invoices
    .map((inv) => ({ invoiceNumber: inv.invoiceNumber, customer: inv.customer.name, status: inv.status, dueDate: inv.dueDate ? formatDate(inv.dueDate) : "—", total: Math.round(toDisplay(toNumber(inv.total), inv.currency) * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
  const outstandingTotal = invoicesOutstanding.reduce((sum, i) => sum + i.total, 0);

  const quoteTotal = quotes.length;
  const quoteAccepted = quotes.filter((q) => q.status === "ACCEPTED").length;
  const quoteConversion = quoteTotal > 0 ? Math.round((quoteAccepted / quoteTotal) * 1000) / 10 : 0;

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.revenue));
  const maxLane = Math.max(1, ...byLane.map((l) => l.revenue));
  const maxCustomer = Math.max(1, ...topCustomers.map((c) => c.revenue));

  const kpis = [
    { label: "Revenue (range)", value: fmtK(totalRevenue, currency), icon: CircleDollarSignIcon },
    { label: "Shipments", value: String(shipments.length), icon: PackageIcon },
    { label: "Active in transit", value: String(activeCount), icon: ShipWheelIcon },
    { label: "Outstanding", value: fmtK(outstandingTotal, currency), icon: ReceiptTextIcon },
    { label: "Quote conversion", value: `${quoteConversion}%`, icon: TrendingUpIcon },
  ];

  const exportData: ReportExportData = {
    generatedAt: new Date().toISOString(),
    range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    currency,
    kpis: kpis.map((k) => ({ label: k.label, value: k.value })),
    shipments: shipments.map((s) => ({
      number: s.shipmentNumber,
      customer: s.customer?.name ?? "—",
      lane: `${s.originPort?.code ?? "?"} → ${s.destinationPort?.code ?? "?"}`,
      mode: s.mode,
      tier: s.tier,
      status: s.status,
      total: Math.round(revenueOf(s) * 100) / 100,
      createdAt: s.createdAt.toISOString().slice(0, 10),
    })),
    monthly,
    byMode,
    byTier,
    byStatus,
    byLane,
    topCustomers,
    invoicesOutstanding,
    quoteConversion: { accepted: quoteAccepted, total: quoteTotal, rate: quoteConversion },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted-foreground">Operational KPIs, revenue breakdowns and exportable datasets.</p>
      </div>

      <ReportsFilter from={from.toISOString().slice(0, 10)} to={to.toISOString().slice(0, 10)} mode={mode ?? ""} status={status ?? ""} />
      <ReportsExport data={exportData} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly revenue</CardTitle>
            <CardDescription>Shipment revenue by month ({currency}).</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipments in range.</p>
            ) : (
              <div className="flex h-44 items-end gap-2">
                {monthly.map((m) => (
                  <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-primary/80 transition-all"
                      style={{ height: `${Math.max(4, (m.revenue / maxMonthly) * 140)}px` }}
                      title={formatCurrency(m.revenue, currency)}
                    />
                    <span className="text-[10px] text-muted-foreground">{m.month.slice(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipments by status</CardTitle>
            <CardDescription>Current mix across the fleet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipments in range.</p>
            ) : (
              byStatus.map((s) => {
                const pct = Math.round((s.count / shipments.length) * 100);
                return (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm">{s.key}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 shrink-0 text-right text-sm tabular-nums">{s.count} ({pct}%)</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {byMode.map((m) => (
              <div key={m.key} className="flex justify-between">
                <span>{m.key}</span>
                <span className="tabular-nums">{formatCurrency(m.revenue, currency)} · {m.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue by tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {byTier.map((t) => (
              <div key={t.key} className="flex justify-between">
                <span>{t.key}</span>
                <span className="tabular-nums">{formatCurrency(t.revenue, currency)} · {t.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quote conversion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total quotes</span><span>{quoteTotal}</span></div>
            <div className="flex justify-between"><span>Accepted / booked</span><span>{quoteAccepted}</span></div>
            <div className="flex justify-between"><span>Conversion rate</span><span className="font-semibold">{quoteConversion}%</span></div>
            <p className="pt-1 text-xs text-muted-foreground">Range: {from.toISOString().slice(0, 10)} → {to.toISOString().slice(0, 10)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top lanes</CardTitle>
            <CardDescription>By shipment revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byLane.map((l) => (
              <div key={l.key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm">{l.key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((l.revenue / maxLane) * 100)}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums">{formatCurrency(l.revenue, currency)}</span>
              </div>
            ))}
            {byLane.length === 0 ? <p className="text-sm text-muted-foreground">No lanes in range.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
            <CardDescription>By shipment revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomers.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-sm">{c.key}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((c.revenue / maxCustomer) * 100)}%` }} />
                </div>
                <span className="w-24 shrink-0 text-right text-sm tabular-nums">{formatCurrency(c.revenue, currency)}</span>
              </div>
            ))}
            {topCustomers.length === 0 ? <p className="text-sm text-muted-foreground">No customers in range.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outstanding invoices</CardTitle>
          <CardDescription>{invoicesOutstanding.length} unpaid · {formatCurrency(outstandingTotal, currency)} due</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoicesOutstanding.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Nothing outstanding in range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5">Number</th>
                    <th className="px-6 py-2.5">Customer</th>
                    <th className="px-6 py-2.5">Status</th>
                    <th className="px-6 py-2.5">Due</th>
                    <th className="px-6 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesOutstanding.map((i) => (
                    <tr key={i.invoiceNumber} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">{i.invoiceNumber}</td>
                      <td className="px-6 py-2.5">{i.customer}</td>
                      <td className="px-6 py-2.5">
                        <Badge variant={i.status === "OVERDUE" ? "destructive" : "outline"}>{i.status}</Badge>
                      </td>
                      <td className="px-6 py-2.5 text-muted-foreground">{i.dueDate}</td>
                      <td className="px-6 py-2.5 text-right tabular-nums">{formatCurrency(i.total, currency)}</td>
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
