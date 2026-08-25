"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

const POLL_INTERVAL = 5 * 60_000; // 5 minutes
const WARNING_THRESHOLD = 30 * 60 * 1000; // 30 minutes before expiry

type SessionStatus = {
  isValid: boolean;
  remainingTime: number;
  reason?: string;
};

export function SessionTimeoutWatcher() {
  const { status, update } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [expireMessage, setExpireMessage] = useState("");
  const warnedRef = useRef(false);

  const checkSession = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/auth/session-check");
      if (!res.ok) {
        // Network error or auth error — don't force logout
        return;
      }
      const data: SessionStatus = await res.json();
      if (!data.isValid) {
        setExpireMessage(data.reason ?? "Session invalid");
        setShowWarning(false);
        setShowExpired(true);
        setCountdown(10);
        return;
      }
      if (data.remainingTime <= WARNING_THRESHOLD && !warnedRef.current) {
        warnedRef.current = true;
        setShowWarning(true);
      }
      if (data.remainingTime > WARNING_THRESHOLD) {
        warnedRef.current = false;
        setShowWarning(false);
      }
    } catch {
      // Network error — skip this check, don't force logout
    }
  }, [status]);

  async function handleExtend() {
    try {
      // Use next-auth's update() to refresh the JWT token
      await update();
      setShowWarning(false);
      warnedRef.current = false;
    } catch {
      // Close anyway so user isn't stuck
      setShowWarning(false);
    }
  }

  async function handleLogout() {
    try {
      setShowWarning(false);
      setShowExpired(false);
      await signOut({ callbackUrl: "/login" });
    } catch {
      window.location.href = "/login";
    }
  }

  // Poll session periodically
  useEffect(() => {
    if (status !== "authenticated") return;
    checkSession();
    const interval = setInterval(checkSession, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, checkSession]);

  // Countdown when expired — redirect after 10s
  useEffect(() => {
    if (!showExpired) return;
    if (countdown <= 0) {
      window.location.href = "/login?reason=session_expired";
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showExpired, countdown]);

  // Reset warning state when session changes
  useEffect(() => {
    if (status !== "authenticated") {
      setShowWarning(false);
      setShowExpired(false);
      warnedRef.current = false;
    }
  }, [status]);

  if (status !== "authenticated") return null;

  return (
    <>
      {/* Warning modal — shown when < 5 min remaining */}
      {showWarning && !showExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg className="size-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">تنبيه انتهاء الجلسة</h3>
                <p className="text-sm text-slate-500">Session Expiration Warning</p>
              </div>
            </div>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              ستنتهي جلستك قريباً. اضغط للتمديد.
              <br />
              <span className="text-xs text-slate-400">Your session is expiring soon. Click to extend.</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleExtend}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                تمديد الجلسة / Extend
              </button>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
              >
                تسجيل خروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expired modal — countdown 10s */}
      {showExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="size-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {expireMessage?.includes("ip_changed")
                    ? "تم اكتشاف دخول من جهاز جديد"
                    : "انتهت الجلسة"}
                </h3>
                <p className="text-sm text-slate-500">Session Ended</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              {expireMessage?.includes("ip_changed")
                ? "تم اكتشاف دخول من جهاز آخر. يرجى تسجيل الدخول مرة أخرى."
                : "انتهت صلاحية جلستك. سيتم تحويلك لصفحة تسجيل الدخول."}
            </p>
            <p className="mb-6 text-center text-2xl font-bold text-red-600">{countdown}</p>
            <div className="text-center text-xs text-slate-400">
              سيتم التحويل تلقائياً خلال {countdown} ثواني...
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
            >
              تسجيل الدخول الآن / Login Now
            </button>
          </div>
        </div>
      )}
    </>
  );
}
