export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketCreateForm } from "@/components/bookings/ticket-create-form";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const scope = await getScope();
  const tickets = await prisma.ticket.findMany({
    where: scope.userEmail && !scope.ops ? { customerEmail: scope.userEmail } : {},
    orderBy: { updatedAt: "desc" },
  });

  const open = tickets.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground">
          {scope.ops ? "Customer tickets and inquiries." : "Get help with your shipments and billing."}
        </p>
      </div>

      {!scope.ops ? (
        <Card>
          <CardHeader>
            <CardTitle>Open a new ticket</CardTitle>
            <CardDescription>We usually respond within one business day.</CardDescription>
          </CardHeader>
          <CardContent>
            <TicketCreateForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>All tickets</CardTitle>
          <CardDescription>{tickets.length} total · {open} open</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tickets.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {scope.ops ? "No tickets yet." : "You have no tickets yet. Open one above."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-6 py-2.5">Ticket</th>
                    <th className="px-6 py-2.5">Subject</th>
                    {scope.ops ? <th className="px-6 py-2.5">Customer</th> : null}
                    <th className="px-6 py-2.5">Priority</th>
                    <th className="px-6 py-2.5">Status</th>
                    <th className="px-6 py-2.5">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-6 py-2.5 font-medium">
                        <Link href={`/support/${t.id}`} className="hover:underline">
                          {t.number}
                        </Link>
                      </td>
                      <td className="px-6 py-2.5">
                        <Link href={`/support/${t.id}`} className="hover:underline">
                          {t.subject}
                        </Link>
                      </td>
                      {scope.ops ? <td className="px-6 py-2.5 text-muted-foreground">{t.customerName}</td> : null}
                      <td className="px-6 py-2.5">
                        <Badge variant={t.priority === "HIGH" || t.priority === "URGENT" ? "destructive" : "outline"}>{t.priority}</Badge>
                      </td>
                      <td className="px-6 py-2.5">
                        <Badge variant={t.status === "CLOSED" ? "outline" : "default"}>{t.status}</Badge>
                      </td>
                      <td className="px-6 py-2.5 text-muted-foreground">{formatDate(t.updatedAt)}</td>
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
