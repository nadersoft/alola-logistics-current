import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    isValid: true,
    remainingTime: 24 * 60 * 60 * 1000, // 24 ساعة
    reason: "ok"
  });
}
