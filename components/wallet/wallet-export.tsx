"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, FileSpreadsheetIcon, FileDownIcon } from "lucide-react";
import ExcelJS from "exceljs";

export type WalletRow = {
  number: string;
  customer: string;
  shipment: string;
  status: string;
  total: number;
  currency: string;
  dueDate: string;
};

function cur(n: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

export function WalletExport({ rows }: { rows: WalletRow[] }) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState<"xlsx" | "csv">("xlsx");

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onExcel() {
    setLabel("xlsx");
    startTransition(async () => {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Alola Logistics";
      wb.created = new Date();
      const sheet = wb.addWorksheet("Statement");
      sheet.columns = [
        { header: "Number", key: "number", width: 16 },
        { header: "Customer", key: "customer", width: 28 },
        { header: "Shipment", key: "shipment", width: 16 },
        { header: "Status", key: "status", width: 12 },
        { header: "Total", key: "total", width: 16 },
        { header: "Due", key: "dueDate", width: 14 },
      ];
      sheet.addRows(
        rows.map((r) => ({ number: r.number, customer: r.customer, shipment: r.shipment, status: r.status, total: cur(r.total, r.currency), dueDate: r.dueDate }))
      );
      sheet.getRow(1).font = { bold: true };
      const buf = await wb.xlsx.writeBuffer();
      downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `alola-wallet.xlsx`);
    });
  }

  function onCsv() {
    setLabel("csv");
    startTransition(() => {
      const escape = (v: string | number) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["Number", "Customer", "Shipment", "Status", "Total", "Due"];
      const body = rows.map((r) => [r.number, r.customer, r.shipment, r.status, cur(r.total, r.currency), r.dueDate].map(escape).join(","));
      const csv = [header.join(","), ...body].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "alola-wallet.csv");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1" onClick={onExcel} disabled={pending}>
        {pending && label === "xlsx" ? <Loader2Icon className="size-3.5 animate-spin" /> : <FileSpreadsheetIcon className="size-3.5" />}
        Export Excel
      </Button>
      <Button variant="outline" size="sm" className="gap-1" onClick={onCsv} disabled={pending}>
        {pending && label === "csv" ? <Loader2Icon className="size-3.5 animate-spin" /> : <FileDownIcon className="size-3.5" />}
        Export CSV
      </Button>
    </div>
  );
}
