export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/authz";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketReplyForm, TicketStatusSelect } from "@/components/bookings/ticket-actions";
import { ChevronLeftIcon } from "lucide-react";

export const metadata = { title: "Ticket" };

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const scope = await getScope();
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { messages: { orderBy: { createdAt: "asc" } }, assignee: true },
  });
  if (!ticket) notFound();
  if (!scope.ops && ticket.customerEmail !== scope.userEmail) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/support" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-4" />
          All tickets
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
            <p className="text-sm text-muted-foreground">
              {ticket.number} · {ticket.customerName} · opened {formatDate(ticket.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {scope.ops ? <TicketStatusSelect ticketId={ticket.id} current={ticket.status} /> : null}
            <Badge variant={ticket.priority === "HIGH" || ticket.priority === "URGENT" ? "destructive" : "outline"}>{ticket.priority}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thread</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            ticket.messages.map((m) => (
              <div key={m.id} className="rounded-xl border p-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">{m.authorName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{m.body}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reply</CardTitle>
        </CardHeader>
        <CardContent>
          <TicketReplyForm ticketId={ticket.id} />
        </CardContent>
      </Card>
    </div>
  );
}
