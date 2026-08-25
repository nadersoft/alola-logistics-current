"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import type { CustomerTrackingRow } from "@/lib/actions/customer-tracking";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function CustomerTrackingTable({ rows, error }: { rows: CustomerTrackingRow[]; error?: string }) {
  function onExport() {
    const header = ["Name", "Email", "Phone", "Phone verified", "Country", "Origin country", "City", "Address", "Profile updated", "Account created", "Account updated"];
    const lines = rows.map((r) =>
      [
        r.name ?? "",
        r.email ?? "",
        r.phone ?? "",
        r.phoneVerified ? "Yes" : "No",
        r.country ?? "",
        r.originCountry ?? "",
        r.city ?? "",
        r.address ?? "",
        r.profileUpdatedAt ? new Date(r.profileUpdatedAt).toISOString() : "",
        r.accountCreatedAt,
        r.accountUpdatedAt,
      ]
        .map(csvEscape)
        .join(",")
    );
    const csv = [header.map(csvEscape).join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All clients</CardTitle>
            <CardDescription>{rows.length} registered clients</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onExport} disabled={rows.length === 0}>
            <DownloadIcon className="size-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? <p className="px-6 pb-6 text-sm text-destructive">{error}</p> : null}
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No registered clients yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Origin</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Profile updated</TableHead>
                <TableHead className="pr-6 text-right">Account updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.userId}>
                  <TableCell className="px-6 font-medium">{r.name ?? "—"}</TableCell>
                  <TableCell>{r.email ?? "—"}</TableCell>
                  <TableCell>{r.phone ?? "—"}</TableCell>
                  <TableCell>{r.country ?? "—"}</TableCell>
                  <TableCell>{r.originCountry ?? "—"}</TableCell>
                  <TableCell>{r.city ?? "—"}</TableCell>
                  <TableCell>{r.profileUpdatedAt ? formatDate(new Date(r.profileUpdatedAt)) : "—"}</TableCell>
                  <TableCell className="pr-6 text-right text-muted-foreground">{formatDate(new Date(r.accountUpdatedAt))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
