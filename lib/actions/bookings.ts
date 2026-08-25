"use server";

import { z } from "zod";
import type { InvoiceStatus, ShipmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/log";
import { auth } from "@/auth";
import { toNumber } from "@/lib/format";
import { sendAlert, notifyCustomerByEmail, notifyOps } from "@/lib/notify";

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

async function canAccessCustomer(role: string | null | undefined, email: string | null | undefined, customerId: string | null | undefined): Promise<boolean> {
  if (isOps(role)) return true;
  if (!customerId || !email) return false;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  return customer?.email?.toLowerCase() === email.toLowerCase();
}

// ---------- Booking: quote → shipment + invoice ----------

export async function bookQuote(quoteId: string): Promise<{ ok: boolean; error?: string; shipmentNumber?: string; invoiceNumber?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { customer: true, originPort: true, destinationPort: true, containerType: true },
  });
  if (!quote) return { ok: false, error: "Quote not found." };
  if (!(await canAccessCustomer(session.user.role, session.user.email, quote.customerId))) {
    return { ok: false, error: "You do not have access to this quote." };
  }
  if (quote.status !== "PENDING") return { ok: false, error: "Only pending quotes can be booked." };
  if (quote.validUntil && quote.validUntil < new Date()) return { ok: false, error: "This quote has expired. Please request a new one." };

  const [shipmentNumber, invoiceNumber] = await Promise.all([nextNumber("SHP"), nextNumber("INV")]);
  const total = toNumber(quote.total);

  const shipment = await prisma.shipment.create({
    data: {
      shipmentNumber,
      customerId: quote.customerId!,
      mode: quote.mode,
      originPortId: quote.originPortId!,
      destinationPortId: quote.destinationPortId!,
      containerTypeId: quote.containerTypeId,
      tier: quote.tier,
      status: "CREATED",
      totalCost: total,
      currency: quote.currency,
      quoteId: quote.id,
      events: {
        create: [{ status: "CREATED", location: quote.originPort?.name ?? null, note: "Booking confirmed by Alola Logistics" }],
      },
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: quote.customerId!,
      shipmentId: shipment.id,
      quoteId: quote.id,
      status: "SENT",
      subtotal: total,
      taxes: 0,
      total,
      currency: quote.currency,
      items: {
        quoteNumber: quote.quoteNumber,
        mode: quote.mode,
        tier: quote.tier,
        cargo: quote.cargo,
      },
      dueDate: new Date(Date.now() + 14 * 86400000),
    },
  });

  await prisma.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
  await notifyOps(`Booking confirmed ${shipmentNumber}`, `${quote.originPort?.code} → ${quote.destinationPort?.code} · ${quote.currency} ${total}`, "success");
  await notifyCustomerByEmail(quote.customer?.email, `Booking ${shipmentNumber} confirmed`, `${quote.originPort?.code} → ${quote.destinationPort?.code}. Invoice ${invoiceNumber} issued.`, "success");

  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "BOOKING_CREATED",
    target: `shipment:${shipmentNumber}`,
    payload: { quoteId: quote.id, invoiceNumber },
  });

  const from = quote.originPort?.code;
  const to = quote.destinationPort?.code;
  await sendAlert({
    channel: "whatsapp",
    to: quote.customer?.phone ?? null,
    message: `Alola Logistics: booking ${shipmentNumber} confirmed (${from} → ${to}). Invoice ${invoiceNumber}. Track: https://${process.env.APP_URL ?? "localhost:3000"}/track/${shipmentNumber}`,
  });

  return { ok: true, shipmentNumber, invoiceNumber };
}

// ---------- Shipment lifecycle ----------

const statusSchema = z.object({
  shipmentId: z.string().min(1),
  status: z.enum(["CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS", "DELIVERED", "CANCELLED"] as const),
  location: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000).optional(),
});

export async function updateShipmentStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "Admin access required." };

  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid status update." };

  const shipment = await prisma.shipment.findUnique({
    where: { id: parsed.data.shipmentId },
    include: { customer: true, originPort: true, destinationPort: true },
  });
  if (!shipment) return { ok: false, error: "Shipment not found." };

  const status = parsed.data.status as ShipmentStatus;
  await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      status,
      events: {
        create: [{
          status,
          location: parsed.data.location || null,
          note: parsed.data.note || null,
        }],
      },
    },
  });

  await notifyCustomerByEmail(shipment.customer?.email, `${shipment.shipmentNumber} → ${status}`, `${shipment.originPort.code} → ${shipment.destinationPort.code}${parsed.data.location ? ` · ${parsed.data.location}` : ""}`, "info");
  await notifyOps(`Status update: ${shipment.shipmentNumber}`, `${status}${parsed.data.location ? ` · ${parsed.data.location}` : ""}`, "info");
  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "SHIPMENT_STATUS",
    target: `shipment:${shipment.shipmentNumber}`,
    payload: { status, location: parsed.data.location ?? null },
  });
  await sendAlert({
    channel: "whatsapp",
    to: shipment.customer?.phone ?? null,
    message: `Alola Logistics: ${shipment.shipmentNumber} is now ${status}${parsed.data.location ? ` at ${parsed.data.location}` : ""}.`,
  });

  return { ok: true };
}

// ---------- Invoices ----------

const invoiceSchema = z.object({
  invoiceId: z.string().min(1),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"] as const),
});

export async function setInvoiceStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "Admin access required." };

  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid invoice status." };

  const status = parsed.data.status as InvoiceStatus;
  const invoice = await prisma.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: { status, paidAt: status === "PAID" ? new Date() : null },
    include: { customer: true },
  });

  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "INVOICE_STATUS",
    target: `invoice:${invoice.invoiceNumber}`,
    payload: { status },
  });
  if (status === "PAID") {
    await notifyOps(`Invoice ${invoice.invoiceNumber} paid`, `${invoice.customer.name} settled ${invoice.invoiceNumber}.`, "success");
    await notifyCustomerByEmail(invoice.customer?.email, `Invoice ${invoice.invoiceNumber} paid`, "Thank you — your payment has been recorded.", "success");
    await sendAlert({ channel: "whatsapp", to: invoice.customer?.phone ?? null, message: `Alola Logistics: invoice ${invoice.invoiceNumber} marked as paid. Thank you!` });
  }

  return { ok: true };
}

export async function createInvoiceFromShipment(shipmentId: string): Promise<{ ok: boolean; error?: string; invoiceNumber?: string }> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "Admin access required." };

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { customer: true, quote: true },
  });
  if (!shipment) return { ok: false, error: "Shipment not found." };
  const existing = await prisma.invoice.findUnique({ where: { shipmentId: shipment.id } });
  if (existing) return { ok: false, error: `Invoice ${existing.invoiceNumber} already exists.` };

  const total = toNumber(shipment.totalCost);
  const invoiceNumber = await nextNumber("INV");
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: shipment.customerId,
      shipmentId: shipment.id,
      quoteId: shipment.quoteId,
      status: "SENT",
      subtotal: total,
      taxes: 0,
      total,
      currency: shipment.currency,
      items: { shipmentNumber: shipment.shipmentNumber },
      dueDate: new Date(Date.now() + 14 * 86400000),
    },
  });

  await notifyCustomerByEmail(shipment.customer?.email, `Invoice ${invoiceNumber} issued`, `Invoice ${invoiceNumber} is ready for ${shipment.shipmentNumber}.`, "success");
  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "INVOICE_CREATED",
    target: `invoice:${invoice.invoiceNumber}`,
    payload: { shipmentId },
  });

  return { ok: true, invoiceNumber: invoice.invoiceNumber };
}

// ---------- Support / tickets ----------

const ticketReplySchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2, "Message is too short.").max(4000),
});

export async function replyTicket(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const parsed = ticketReplySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reply." };

  const ticket = await prisma.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket) return { ok: false, error: "Ticket not found." };
  const isStaff = isOps(session.user.role);
  if (!isStaff && ticket.customerEmail !== session.user.email) return { ok: false, error: "You do not have access to this ticket." };

  const authorName = isStaff ? session.user.name ?? "Support" : ticket.customerName;
  await prisma.ticketMessage.create({
    data: { ticketId: parsed.data.ticketId, authorName, body: parsed.data.body },
  });
  await prisma.ticket.update({ where: { id: parsed.data.ticketId }, data: { status: "IN_PROGRESS" } });

  if (isStaff) {
    await notifyCustomerByEmail(ticket.customerEmail, `New reply on ${ticket.number}`, ticket.subject, "info");
  } else {
    await notifyOps(`New reply on ${ticket.number}`, ticket.subject, "info");
  }

  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "TICKET_REPLY",
    target: `ticket:${parsed.data.ticketId}`,
  });

  return { ok: true };
}

const ticketStatusSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const),
});

export async function setTicketStatus(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "Admin access required." };

  const parsed = ticketStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid ticket status." };

  await prisma.ticket.update({ where: { id: parsed.data.ticketId }, data: { status: parsed.data.status } });
  await audit({
    actorId: session.user.id,
    actorRole: session.user.role,
    action: "TICKET_STATUS",
    target: `ticket:${parsed.data.ticketId}`,
    payload: { status: parsed.data.status },
  });

  return { ok: true };
}

// ---------- Sequential numbers ----------

async function nextNumber(prefix: "SHP" | "INV"): Promise<string> {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}-`;
  const model = prefix === "SHP" ? prisma.shipment : prisma.invoice;
  const field = prefix === "SHP" ? "shipmentNumber" : "invoiceNumber";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const last = await (model as any).findFirst({
    where: { [field]: { startsWith: key } },
    orderBy: { [field]: "desc" },
    select: { [field]: true },
  });
  const seq = last ? (parseInt(last[field].slice(key.length), 10) || 0) + 1 : 1;
  return `${key}${String(seq).padStart(4, "0")}`;
}
