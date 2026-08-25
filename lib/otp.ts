import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { readSecret } from "@/lib/settings";

/**
 * Shared OTP helpers — used by both self-service registration (lib/auth.ts)
 * and the account "add / verify phone later" flow (lib/actions/account.ts).
 * ZERO hardcoded delivery config: Twilio (WhatsApp → SMS) and Resend (email)
 * resolve through SystemSetting with console fallback (trial mode).
 */

export const OTP_TTL_MS = 2 * 60 * 1000; // 2-minute smart OTP
export const OTP_MAX_ATTEMPTS = 5;

export function normalizePhone(countryCode: string, phone: string): string {
  return `${countryCode}${phone.replace(/[^0-9]/g, "")}`;
}

// ---------- Delivery providers (WhatsApp Twilio → SMS → console.log) ----------

async function sendViaWhatsApp(sid: string, token: string, from: string, to: string, body: string): Promise<boolean> {
  const fromWA = from.includes("whatsapp:") ? from : `whatsapp:${from}`;
  const toWA = `whatsapp:${to}`;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    body: new URLSearchParams({ From: fromWA, To: toWA, Body: body }),
  });
  return res.ok;
}

async function sendViaSms(sid: string, token: string, from: string, to: string, body: string): Promise<boolean> {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  return res.ok;
}

export async function deliverOtp(to: string, code: string, phone: string): Promise<{ ok: boolean; provider: "whatsapp" | "sms" | "console" }> {
  const [sid, token, from] = await Promise.all([
    readSecret("integration.twilio.sid"),
    readSecret("integration.twilio.token") || readSecret("integration.twilio.authToken"),
    readSecret("integration.twilio.from"),
  ]);
  const body = `Alola Logistics: your verification code is ${code}. It expires in 2 minutes.`;

  if (sid && token && from) {
    try {
      if (await sendViaWhatsApp(sid, token, from, to, body)) return { ok: true, provider: "whatsapp" };
      if (await sendViaSms(sid, token, from, to, body)) return { ok: true, provider: "sms" };
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "otp:twilio-failed");
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV ONLY OTP] Phone ${phone} → ${code}`);
  }
  return { ok: true, provider: "console" };
}

export async function deliverEmailOtp(to: string, code: string): Promise<{ ok: boolean; provider: "email" | "console" }> {
  const [key, from] = await Promise.all([
    readSecret("integration.resend.key"),
    readSecret("integration.resend.from"),
  ]);

  if (key && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          subject: "Alola Logistics — verification code",
          html: `<p>Your verification code is <b>${code}</b>. It expires in 2 minutes.</p>`,
        }),
      });
      if (res.ok) return { ok: true, provider: "email" };
      logger.warn({ status: res.status }, "otp:resend-failed");
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "otp:resend-error");
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV ONLY OTP] Email ${to} → ${code}`);
  }
  return { ok: true, provider: "console" };
}

/** Persist an OTP and return the code (caller is responsible for delivery). */
export async function persistOtp(input: { identifier: string; channel: "phone" | "email" }): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.otpVerification.create({
    data: {
      identifier: input.identifier,
      channel: input.channel,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  return code;
}
