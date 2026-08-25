import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days (must match auth.ts)

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ isValid: false, remainingTime: 0, reason: "no_session" });
    }

    const lastActivity = (session.user as Record<string, unknown>).lastActivity as number | null;
    const loginTime = (session.user as Record<string, unknown>).loginTime as number | null;
    const now = Date.now();

    // Session expires after SESSION_MAX_AGE from login
    const sessionAge = loginTime ? now - loginTime : 0;
    const sessionRemaining = Math.max(0, SESSION_MAX_AGE - sessionAge);

    if (sessionRemaining <= 0) {
      return NextResponse.json({ isValid: false, remainingTime: 0, reason: "expired" });
    }

    return NextResponse.json({
      isValid: true,
      remainingTime: sessionRemaining,
      lastActivity: lastActivity ?? now,
      loginTime: loginTime ?? null,
    });
  } catch {
    return NextResponse.json({ isValid: false, remainingTime: 0, reason: "error" });
  }
}
