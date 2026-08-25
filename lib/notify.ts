import "server-only";
import { prisma } from "@/lib/prisma";
import { getTwilioCreds, getWhatsAppKey } from "@/lib/integrations";
import { logger } from "@/lib/log";

/**
 * Twilio-powered alerts (WhatsApp + SMS) via the Integration Provider Pattern.
 * Keys come from SystemSetting (Command Center → Integrations) with process.env
 * fallback. When not configured, a console message is printed and the flow
 * never breaks (trial mode). ZERO hardcoded config.
 */
export type AlertChannel = "whatsapp" | "sms";

async function twilioConfig(channel: AlertChannel) {
  const [{ sid, token, from }, whatsappKey] = await Promise.all([getTwilioCreds(), getWhatsAppKey()]);
  const auth = channel === "whatsapp" && whatsappKey.source !== "none" ? whatsappKey.value : token.value;
  return { sid: sid.value, authToken: auth, from: from.value };
}

export async function sendAlert(opts: { channel: AlertChannel; to?: string | null; message: string }): Promise<{ ok: boolean; sent?: boolean; reason?: string }> {
  if (!opts.to) return { ok: true, reason: "no-recipient" };
  const { sid, authToken, from } = await twilioConfig(opts.channel);
  if (!sid || !authToken || !from) {
    logger.warn({ channel: opts.channel, to: opts.to }, "alert:not-configured — trial mode (Command Center → Integrations)");
    return { ok: true, reason: "not-configured" };
  }

  const prefix = opts.channel === "whatsapp" ? "whatsapp:" : "";
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `${prefix}${opts.to}`,
        From: `${prefix}${from}`,
        Body: opts.message,
      }).toString(),
    });
    if (res.ok) {
      logger.info({ channel: opts.channel, to: opts.to }, "alert:sent");
      return { ok: true, sent: true };
    }
    const body = await res.text();
    logger.error({ channel: opts.channel, to: opts.to, status: res.status, body }, "alert:send-failed");
    return { ok: false, reason: `twilio-${res.status}` };
  } catch (err) {
    logger.error({ err, channel: opts.channel }, "alert:error");
    return { ok: false, reason: "network-error" };
  }
}

// ---------- In-app notifications ----------

export type NotificationType = "info" | "success" | "warning" | "alert";

export async function notifyUser(userId: string, opts: { title: string; body: string; type?: NotificationType }): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId, title: opts.title, body: opts.body, type: opts.type ?? "info" },
    });
  } catch (err) {
    logger.error({ err, userId }, "notify:user-failed");
  }
}

/** Notify all SUPER_ADMIN/MANAGER users (ops team). */
export async function notifyOps(title: string, body: string, type: NotificationType = "info"): Promise<void> {
  const ops = await prisma.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "MANAGER"] } }, select: { id: true } });
  await Promise.all(ops.map((u) => notifyUser(u.id, { title, body, type })));
}

/** Notify the user account that owns a customer's email (if any). */
export async function notifyCustomerByEmail(email: string | null | undefined, title: string, body: string, type: NotificationType = "info"): Promise<void> {
  if (!email) return;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return;
  await notifyUser(user.id, { title, body, type });
}
