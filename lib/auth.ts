"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { audit, logger } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { OTP_MAX_ATTEMPTS, deliverEmailOtp, deliverOtp, normalizePhone, persistOtp } from "@/lib/otp";

export type SendOtpResult = {
  ok: boolean;
  error?: string;
  provider?: "whatsapp" | "sms" | "email" | "console";
  channel?: "phone" | "email";
};

export type RegisterResult = {
  ok: boolean;
  error?: string;
};

const sendOtpSchema = z
  .object({
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code").optional().or(z.literal("")),
    phone: z.string().regex(/^[0-9+\- ]{6,20}$/, "Enter a valid phone number").optional().or(z.literal("")),
    email: z.string().trim().email("Enter a valid email").toLowerCase(),
  })
  .refine((v) => v.phone || v.email, { message: "Enter an email or a phone number." });

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(50),
    email: z.string().trim().email("Enter a valid email").toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code").optional().or(z.literal("")),
    phone: z.string().regex(/^[0-9+\- ]{6,20}$/, "Enter a valid phone number").optional().or(z.literal("")),
    otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  })
  .refine((v) => v.phone || v.email, { message: "Enter an email or a phone number." });

// ---------- Send OTP ----------

export async function sendOtp(formData: FormData): Promise<SendOtpResult> {
  const parsed = sendOtpSchema.safeParse({
    countryCode: formData.get("countryCode"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email or phone." };

  const { countryCode = "", phone = "", email } = parsed.data;
  const usePhone = phone.trim().length > 0;
  const identifier = usePhone ? normalizePhone(countryCode, phone) : email;
  const channel = usePhone ? ("phone" as const) : ("email" as const);

  const rl = await checkRateLimit({ scope: "otp", key: `${channel}:${identifier}`, limit: 5, windowSec: 600 });
  if (!rl.ok) return { ok: false, error: "Too many attempts. Please wait a minute." };

  const existing = usePhone
    ? await prisma.user.findUnique({ where: { phone: identifier } })
    : await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: usePhone ? "This phone number is already registered." : "This email is already registered." };

  const code = await persistOtp({ identifier, channel });

  const delivery = usePhone
    ? await deliverOtp(identifier, code, phone)
    : await deliverEmailOtp(email, code);
  const provider = delivery.provider;

  await audit({ actorId: null, action: "OTP_SENT", target: `${channel}:${identifier}`, payload: { provider } });
  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV ONLY OTP] ${channel} → ${identifier} → ${code}`);
  }
  return { ok: true, provider, channel };
}

// ---------- Verify OTP + create account ----------

export async function verifyOtpAndRegister(formData: FormData): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid registration data." };

  const { name, email, password, countryCode = "", phone = "", otp } = parsed.data;
  const usePhone = phone.trim().length > 0;
  const identifier = usePhone ? normalizePhone(countryCode, phone) : email;
  const channel = usePhone ? "phone" : "email";

  const verification = await prisma.otpVerification.findFirst({
    where: { identifier, channel, usedAt: null, code: otp },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) return { ok: false, error: "Invalid OTP code." };
  if (verification.expiresAt < new Date()) return { ok: false, error: "OTP expired. Request a new one." };
  if (verification.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Too many attempts. Request a new OTP." };

  await prisma.otpVerification.update({ where: { id: verification.id }, data: { attempts: { increment: 1 } } });

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken) return { ok: false, error: "This email is already registered." };
  if (usePhone) {
    const phoneTaken = await prisma.user.findUnique({ where: { phone: identifier } });
    if (phoneTaken) return { ok: false, error: "This phone number is already registered." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: usePhone
      ? { name, email, phone: identifier, phoneVerified: true, countryCode, role: Role.CLIENT, passwordHash }
      : { name, email, emailVerified: new Date(), role: Role.CLIENT, passwordHash },
  });

  await prisma.otpVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } });

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "REGISTER",
    target: `user:${user.id}`,
    payload: { email, channel, phone: usePhone ? identifier : undefined },
  });

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "auth:auto-signin-failed");
  }

  return { ok: true };
}
