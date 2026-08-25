"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, AlertTriangleIcon, ClockIcon, RefreshCwIcon } from "lucide-react";
import {
  getSessionSettings,
  updateSessionSettings,
  getSecurityAlerts,
  getAuthAuditLog,
  type SessionSettings,
  type SecurityAlert,
} from "@/lib/actions/system";

export default function AdminSecurityPage() {
  const [settings, setSettings] = useState<SessionSettings | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [auditLog, setAuditLog] = useState<SecurityAlert[]>([]);
  const [loading, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [s, a, al] = await Promise.all([getSessionSettings(), getSecurityAlerts(20), getAuthAuditLog(30)]);
      setSettings(s);
      setAlerts(a);
      setAuditLog(al);
    } catch {
      setMsg("Failed to load security data");
    }
  }

  async function handleSaveSettings() {
    if (!settings) return;
    startTransition(async () => {
      const res = await updateSessionSettings(settings);
      setMsg(res.ok ? "Settings saved" : res.error ?? "Failed");
      if (res.ok) setTimeout(() => setMsg(null), 3000);
    });
  }

  function alertColor(action: string) {
    if (action.includes("HIJACK")) return "destructive" as const;
    if (action.includes("EXPIRED")) return "secondary" as const;
    return "outline" as const;
  }

  function alertIcon(action: string) {
    if (action.includes("HIJACK")) return <AlertTriangleIcon className="size-4 text-red-500" />;
    if (action.includes("EXPIRED")) return <ClockIcon className="size-4 text-amber-500" />;
    return <ShieldCheckIcon className="size-4 text-blue-500" />;
  }

  function formatTime(d: Date | string) {
    return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الأمان والجلسات / Security</h1>
          <p className="text-sm text-muted-foreground">Session management, IP monitoring, and audit logs.</p>
        </div>
        <Button variant="outline" onClick={() => load()} disabled={loading}>
          <RefreshCwIcon className="mr-2 size-4" /> Refresh
        </Button>
      </div>

      {msg && (
        <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
          {msg}
        </div>
      )}

      {/* Card 1: Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-5" />
            إعدادات الجلسة / Session Settings
          </CardTitle>
          <CardDescription>Configure session timeout, IP checking, and concurrent limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Session Timeout (minutes)</label>
                  <input
                    type="range"
                    min={15}
                    max={120}
                    value={settings.timeoutMinutes}
                    onChange={(e) => setSettings({ ...settings, timeoutMinutes: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{settings.timeoutMinutes} min</span>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Max Sessions Per User</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.maxSessionsPerUser}
                    onChange={(e) => setSettings({ ...settings, maxSessionsPerUser: Number(e.target.value) })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={settings.ipCheckEnabled}
                      onChange={(e) => setSettings({ ...settings, ipCheckEnabled: e.target.checked })}
                      className="size-4"
                    />
                    تفعيل كشف تغيير IP / Enable IP Change Detection
                  </label>
                </div>
              </div>
              <Button onClick={handleSaveSettings} disabled={loading}>
                حفظ الإعدادات / Save Settings
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5" />
            محاولات مشبوهة / Security Alerts
          </CardTitle>
          <CardDescription>IP change attempts, expired sessions, and suspicious activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No security alerts. System is clean.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  {alertIcon(a.action)}
                  <Badge variant={alertColor(a.action)}>{a.action}</Badge>
                  <span className="flex-1 text-muted-foreground">{a.target}</span>
                  <span className="text-xs text-muted-foreground">{formatTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Auth Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="size-5" />
            سجل الأمان / Auth Audit Log
          </CardTitle>
          <CardDescription>Recent authentication events — registrations, OTPs, session events.</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Target</th>
                    <th className="px-3 py-2">Details</th>
                    <th className="px-3 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{l.action}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{l.target}</td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-xs text-muted-foreground">
                        {l.payload ? JSON.stringify(l.payload) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
