"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatabaseIcon, DownloadIcon, RefreshCwIcon, FileJsonIcon, FileSpreadsheetIcon } from "lucide-react";
import { getExportableTables, exportTableData, getDbStats, getRecentExports, type TableName } from "@/lib/actions/backup";

export default function AdminBackupPage() {
  const [tables, setTables] = useState<TableName[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentExports, setRecentExports] = useState<{ id: string; table: string; rows: number; createdAt: Date }[]>([]);
  const [loading, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [t, s, e] = await Promise.all([getExportableTables(), getDbStats(), getRecentExports()]);
      setTables(t);
      setStats(s);
      setRecentExports(e);
    } catch {
      setMsg("Failed to load backup data");
    }
  }

  function downloadJson(tableName: string, data: unknown) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName.toLowerCase()}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportTable(table: TableName, format: "json" | "csv") {
    startTransition(async () => {
      try {
        if (format === "csv" || format === "json") {
          window.open(`/api/admin/backup?table=${table}&format=${format}`, "_blank");
        } else {
          const res = await exportTableData(table);
          if (res.ok && res.data) {
            downloadJson(table, res.data);
          } else {
            setMsg(res.error ?? "Export failed");
          }
        }
        setMsg(`Exported ${table} successfully`);
        setTimeout(() => setMsg(null), 3000);
      } catch {
        setMsg("Export failed");
      }
    });
  }

  function formatTime(d: Date | string) {
    return new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">النسخ الاحتياطي / Database Backup</h1>
          <p className="text-sm text-muted-foreground">Export tables as JSON, CSV. View database statistics.</p>
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

      {/* Card 1: Database Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-5" />
            إحصائيات قاعدة البيانات / Database Statistics
          </CardTitle>
          <CardDescription>Row counts for all exportable tables.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables.map((t) => (
              <div key={t} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{t}</div>
                <div className="text-2xl font-bold text-primary">{(stats[t] ?? 0).toLocaleString()}</div>
                <div className="mt-2 text-xs text-muted-foreground">rows</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Export Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DownloadIcon className="size-5" />
            تصدير البيانات / Export Data
          </CardTitle>
          <CardDescription>Download individual tables as JSON or CSV.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Table</th>
                  <th className="px-3 py-2 text-right">Rows</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => (
                  <tr key={t} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{t}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{(stats[t] ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportTable(t, "json")}
                          disabled={loading}
                        >
                          <FileJsonIcon className="mr-1 size-3" /> JSON
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExportTable(t, "csv")}
                          disabled={loading}
                        >
                          <FileSpreadsheetIcon className="mr-1 size-3" /> CSV
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCwIcon className="size-5" />
            سجل التصدير / Recent Exports
          </CardTitle>
          <CardDescription>Last 20 export operations.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentExports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Table</th>
                    <th className="px-3 py-2 text-right">Rows</th>
                    <th className="px-3 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExports.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        <Badge variant="outline">{e.table}</Badge>
                      </td>
                      <td className="px-3 py-2 text-right">{e.rows.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatTime(e.createdAt)}</td>
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
