"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { audit } from "@/lib/log";
import { notifyOps } from "@/lib/notify";

const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(5000),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
});

export async function createTicket(formData: FormData): Promise<{ ok: boolean; error?: string; ticketId?: string; ticketNumber?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const parsed = createTicketSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    priority: formData.get("priority") ?? "NORMAL",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const customer = session.user.email
    ? await prisma.customer.findFirst({ where: { email: session.user.email.toLowerCase() } })
    : null;
  const name = customer?.name ?? session.user.name ?? session.user.email ?? "Customer";
  const email = session.user.email ?? customer?.email ?? null;

  const number = await nextTicketNumber();
  const ticket = await prisma.ticket.create({
    data: {
      number,
      customerName: name,
      customerEmail: email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      priority: parsed.data.priority,
      status: "OPEN",
      messages: {
        create: [{ authorName: name, body: parsed.data.message }],
      },
    },
  });

  await notifyOps(`New ticket ${number}`, `${name}: ${parsed.data.subject}`, "alert");

  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "TICKET_CREATE",
    target: `ticket:${ticket.id}`,
    payload: { subject: parsed.data.subject },
  });

  return { ok: true, ticketId: ticket.id, ticketNumber: number };
}

async function nextTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const key = `TCK-${year}-`;
  const last = await prisma.ticket.findFirst({
    where: { number: { startsWith: key } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? (parseInt(last.number.slice(key.length), 10) || 0) + 1 : 1;
  return `${key}${String(seq).padStart(4, "0")}`;
}
