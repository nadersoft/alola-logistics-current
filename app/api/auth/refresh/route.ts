import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // The JWT callback with trigger="update" already updates lastActivity.
    // This endpoint simply re-validates the session to prove it's still alive.
    // Client should use useSession().update() for actual token refresh.
    return NextResponse.json({ success: true, timestamp: Date.now() });
  } catch {
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
