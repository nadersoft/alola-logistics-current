export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatCurrency, formatDate, toNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Clock } from "lucide-react";

export const metadata = { title: "Quotes" };

export default async function QuotesPage() {
  const scope = await getScope();
  const quotes = await prisma.quote.findMany({
    where: scope.customerId ? { customerId: scope.customerId } : {},
    orderBy: { createdAt: "desc" },
    include: { customer: true, originPort: true, destinationPort: true, voyage: true },
    take: 50,
  });

  function validUntilCountdown(validUntil: Date | null) {
    if (!validUntil) return null;
    const now = new Date();
    const diff = new Date(validUntil).getTime() - now.getTime();
    if (diff <= 0) return <Badge variant="destructive">Expired</Badge>;
    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3" /> {hours}h {mins}m
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">العروض / Quotes</h1>
          <p className="text-sm text-muted-foreground">
            {scope.ops ? "All quotes across customers." : "عرضي — سعر م valido لمدة 24 ساعة."}
          </p>
        </div>
        <Link href="/dashboard/new-quote">
          <Button className="gap-2"><Plus className="size-4" /> عرض سعر جديد / New Quote</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>العروض الأخيرة / Recent quotes</CardTitle>
          <CardDescription>{quotes.length} latest</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {quotes.length === 0 ? (
            <div className="px-6 pb-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">No quotes yet.</p>
              <Link href="/dashboard/new-quote">
                <Button variant="outline" className="gap-2"><Plus className="size-4" /> عرض سعر جديد</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5">Number</th>
                    <th className="px-4 py-2.5">Route</th>
                    <th className="px-4 py-2.5">Voyage</th>
                    <th className="px-4 py-2.5">Free Time</th>
                    <th className="px-4 py-2.5">Valid Until</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-right">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b last:border-0">
                      <td className="px-4 py-2.5 font-medium">
                        <Link href={`/quotes/${q.id}`} className="hover:underline">{q.quoteNumber}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {q.originPort?.code ?? "—"} → {q.destinationPort?.code ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {q.voyage ? `${q.voyage.vesselName} (${q.voyage.voyageNumber})` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {q.freeTimeDays != null ? (
                          <Badge variant="outline">{q.freeTimeDays}d</Badge>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {validUntilCountdown(q.validUntil)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={q.status === "ACCEPTED" ? "default" : "secondary"}>{q.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">{formatCurrency(toNumber(q.total), q.currency)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatDate(q.createdAt)}</td>
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
