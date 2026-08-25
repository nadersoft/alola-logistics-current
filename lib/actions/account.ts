"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { audit, logger } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { OTP_MAX_ATTEMPTS, deliverOtp, normalizePhone, persistOtp } from "@/lib/otp";
import { notifyUser } from "@/lib/notify";

export type AccountResult = { ok: boolean; error?: string };

export type SendPhoneOtpResult = {
  ok: boolean;
  error?: string;
  provider?: "whatsapp" | "sms" | "console";
};

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: z.string().trim().email("Enter a valid email.").toLowerCase().max(120),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters.").max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export async function updateProfile(formData: FormData): Promise<AccountResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid profile data." };

  const { name, email } = parsed.data;

  const emailTaken = await prisma.user.findFirst({ where: { email, id: { not: session.user.id } } });
  if (emailTaken) return { ok: false, error: "This email is already registered." };

  const user = await prisma.user.update({ where: { id: session.user.id }, data: { name, email } });

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "UPDATE_PROFILE",
    target: `user:${user.id}`,
    payload: { name, email },
  });

  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<AccountResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password data." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) return { ok: false, error: "This account has no password set." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await audit({
    actorId: user.id,
    actorRole: user.role,
    action: "CHANGE_PASSWORD",
    target: `user:${user.id}`,
  });

  logger.info({ userId: user.id }, "account:password-changed");
  return { ok: true };
}

// ---------- Add / verify phone later (email-only signups) ----------

const phoneOtpSchema = z.object({
  countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code"),
  phone: z.string().regex(/^[0-9+\- ]{6,20}$/, "Enter a valid phone number"),
});

export async function sendPhoneOtp(formData: FormData): Promise<SendPhoneOtpResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const parsed = phoneOtpSchema.safeParse({
    countryCode: formData.get("countryCode"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid phone number." };

  const { countryCode, phone } = parsed.data;
  const full = normalizePhone(countryCode, phone);

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return { ok: false, error: "Account not found." };
  if (me.phone === full && me.phoneVerified) return { ok: false, error: "This phone number is already verified on your account." };

  const rl = await checkRateLimit({ scope: "otp", key: `phone:${full}`, limit: 5, windowSec: 600 });
  if (!rl.ok) return { ok: false, error: "Too many attempts. Please wait a minute." };

  const existing = await prisma.user.findUnique({ where: { phone: full } });
  if (existing && existing.id !== me.id) return { ok: false, error: "This phone number is already registered to another account." };

  const code = await persistOtp({ identifier: full, channel: "phone" });
  const { provider } = await deliverOtp(full, code, phone);

  await audit({
    actorId: me.id,
    actorRole: me.role,
    action: "PHONE_OTP_SENT",
    target: `phone:${full}`,
    payload: { provider },
  });

  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV ONLY OTP] Phone ${full} → ${code}`);
  }
  return { ok: true, provider };
}

const verifyPhoneSchema = z
  .object({
    countryCode: z.string().regex(/^\+\d{1,4}$/, "Invalid country code"),
    phone: z.string().regex(/^[0-9+\- ]{6,20}$/, "Enter a valid phone number"),
    otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  })
  .refine((v) => v.otp.length === 6, { message: "Enter the 6-digit code." });

export async function verifyPhone(formData: FormData): Promise<AccountResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const parsed = verifyPhoneSchema.safeParse({
    countryCode: formData.get("countryCode"),
    phone: formData.get("phone"),
    otp: formData.get("otp"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid verification data." };

  const { countryCode, phone, otp } = parsed.data;
  const full = normalizePhone(countryCode, phone);

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return { ok: false, error: "Account not found." };

  const verification = await prisma.otpVerification.findFirst({
    where: { identifier: full, channel: "phone", usedAt: null, code: otp },
    orderBy: { createdAt: "desc" },
  });
  if (!verification) return { ok: false, error: "Invalid OTP code." };
  if (verification.expiresAt < new Date()) return { ok: false, error: "OTP expired. Request a new one." };
  if (verification.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Too many attempts. Request a new OTP." };

  await prisma.otpVerification.update({ where: { id: verification.id }, data: { attempts: { increment: 1 } } });

  const taken = await prisma.user.findFirst({ where: { phone: full, id: { not: me.id } } });
  if (taken) return { ok: false, error: "This phone number is already registered to another account." };

  await prisma.$transaction([
    prisma.otpVerification.update({ where: { id: verification.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: me.id },
      data: { phone: full, countryCode, phoneVerified: true },
    }),
  ]);

  await audit({
    actorId: me.id,
    actorRole: me.role,
    action: "PHONE_VERIFIED",
    target: `user:${me.id}`,
    payload: { phone: full },
  });
  await notifyUser(me.id, {
    title: "Phone verified",
    body: "Your phone number is now verified on your account.",
    type: "success",
  });

  return { ok: true };
}
