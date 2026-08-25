"use server";

import crypto from "crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSettingOr } from "@/lib/settings";
import { audit, logger } from "@/lib/log";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const ticketSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(3, "Please add a subject.").max(120),
  message: z.string().trim().min(10, "Please describe your inquiry (min 10 characters).").max(4000),
});

export type TicketResult = {
  ok: boolean;
  error?: string;
  number?: string;
};

function nextTicketNumber(): string {
  const stamp = Date.now().toString().slice(-8);
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `TK-${stamp}-${rand}`;
}

export async function createTicket(formData: FormData): Promise<TicketResult> {
  const parsed = ticketSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid form data." };
  }

  const headerList = headers();
  const ip = clientIp(headerList);
  const limit = await getSettingOr<number>("limits.contactPerMinute", 5);
  const rl = await checkRateLimit({ scope: "contact", key: ip, limit, windowSec: 60 });
  if (!rl.ok) {
    logger.warn({ scope: "contact", ip }, "rate-limited");
    return { ok: false, error: "Too many messages. Please try again in a minute." };
  }

  const data = parsed.data;
  const ticket = await prisma.ticket.create({
    data: {
      number: nextTicketNumber(),
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone || null,
      subject: data.subject,
      message: data.message,
    },
  });

  await prisma.notification.create({
    data: {
      type: "ticket",
      title: `New support ticket ${ticket.number}`,
      body: `${data.subject} — from ${data.name}${data.email ? ` (${data.email})` : ""}`,
    },
  });

  await audit({
    action: "CREATE_TICKET",
    target: `ticket:${ticket.number}`,
    payload: { subject: data.subject, email: data.email, ip },
  });

  return { ok: true, number: ticket.number };
}
