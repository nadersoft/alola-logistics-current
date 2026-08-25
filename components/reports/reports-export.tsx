"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, FileSpreadsheetIcon, FileTextIcon, FileDownIcon } from "lucide-react";
import ExcelJS from "exceljs";

export type ReportExportData = {
  generatedAt: string;
  range: { from: string; to: string };
  currency: string;
  kpis: { label: string; value: string }[];
  shipments: { number: string; customer: string; lane: string; mode: string; tier: string; status: string; total: number; createdAt: string }[];
  monthly: { month: string; revenue: number; count: number }[];
  byMode: { key: string; count: number; revenue: number }[];
  byTier: { key: string; count: number; revenue: number }[];
  byStatus: { key: string; count: number }[];
  byLane: { key: string; count: number; revenue: number }[];
  topCustomers: { key: string; count: number; revenue: number }[];
  invoicesOutstanding: { invoiceNumber: string; customer: string; status: string; dueDate: string; total: number }[];
  quoteConversion: { accepted: number; total: number; rate: number };
};

function cur(n: number, currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

async function buildWorkbook(data: ReportExportData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alola Logistics";
  wb.created = new Date();

  const sheet = wb.addWorksheet("KPIs");
  sheet.columns = [{ width: 26 }, { width: 18 }];
  data.kpis.forEach((k) => sheet.addRow([k.label, k.value]));
  sheet.addRow([]);
  sheet.addRow(["Generated", new Date(data.generatedAt).toLocaleString()]);
  sheet.addRow(["Range", `${data.range.from} → ${data.range.to}`]);

  const ship = wb.addWorksheet("Shipments");
  ship.columns = [
    { header: "Number", key: "number", width: 16 },
    { header: "Customer", key: "customer", width: 28 },
    { header: "Lane", key: "lane", width: 18 },
    { header: "Mode", key: "mode", width: 10 },
    { header: "Tier", key: "tier", width: 12 },
    { header: "Status", key: "status", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Created", key: "createdAt", width: 12 },
  ];
  ship.addRows(data.shipments);
  ship.getRow(1).font = { bold: true };

  const withRows = (name: string, rows: { key: string; count?: number; revenue?: number }[], includeRevenue: boolean) => {
    const s = wb.addWorksheet(name);
    s.columns = [
      { header: "Group", key: "key", width: 24 },
      { header: "Count", key: "count", width: 10 },
      ...(includeRevenue ? [{ header: "Revenue", key: "revenue", width: 16 }] : []),
    ];
    s.addRows(rows.map((r) => ({ key: r.key, count: r.count ?? 0, revenue: r.revenue != null ? cur(r.revenue, data.currency) : undefined })));
    s.getRow(1).font = { bold: true };
  };
  withRows("By Mode", data.byMode, true);
  withRows("By Tier", data.byTier, true);
  withRows("By Status", data.byStatus, false);
  withRows("Top Lanes", data.byLane, true);
  withRows("Top Customers", data.topCustomers, true);

  const monthlySheet = wb.addWorksheet("Monthly Revenue");
  monthlySheet.columns = [
    { header: "Month", key: "month", width: 12 },
    { header: "Revenue", key: "revenue", width: 16 },
    { header: "Count", key: "count", width: 10 },
  ];
  monthlySheet.addRows(data.monthly.map((m) => ({ month: m.month, revenue: cur(m.revenue, data.currency), count: m.count })));
  monthlySheet.getRow(1).font = { bold: true };

  const inv = wb.addWorksheet("Outstanding Invoices");
  inv.columns = [
    { header: "Number", key: "invoiceNumber", width: 16 },
    { header: "Customer", key: "customer", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Due", key: "dueDate", width: 14 },
    { header: "Total", key: "total", width: 16 },
  ];
  inv.addRows(data.invoicesOutstanding.map((i) => ({ ...i, total: cur(i.total, data.currency) })));
  inv.getRow(1).font = { bold: true };

  const qc = wb.addWorksheet("Quote Conversion");
  qc.columns = [{ width: 20 }, { width: 14 }];
  qc.addRow(["Accepted", data.quoteConversion.accepted]);
  qc.addRow(["Total", data.quoteConversion.total]);
  qc.addRow(["Rate %", data.quoteConversion.rate]);

  return await wb.xlsx.writeBuffer();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfMake(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfmakeModule: any = await import("pdfmake/build/pdfmake");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsModule: any = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfmakeModule.default ?? pdfmakeModule;
  const vfs = vfsModule.default ?? vfsModule;
  pdfMake.vfs = vfs.pdfMake?.vfs ?? vfs;
  pdfMake.fonts = {
    Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" },
  };
  return pdfMake;
}

function table(header: string[], rows: string[][]) {
  return {
    table: {
      headerRows: 1,
      widths: header.map(() => "*"),
      body: [header, ...rows],
    },
    layout: "lightHorizontalLines" as const,
  };
}

export function ReportsExport({ data }: { data: ReportExportData }) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState<"xlsx" | "pdf" | "csv">("xlsx");

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
      const buf = await buildWorkbook(data);
      downloadBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `alola-report-${data.range.from}.xlsx`);
    });
  }

  function onCsv() {
    setLabel("csv");
    startTransition(() => {
      const escape = (v: string | number) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = ["Number", "Customer", "Lane", "Mode", "Tier", "Status", "Total", "Created"];
      const rows = data.shipments.map((s) => [s.number, s.customer, s.lane, s.mode, s.tier, s.status, String(s.total), s.createdAt].map(escape).join(","));
      const csv = [header.join(","), ...rows].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `alola-report-${data.range.from}.csv`);
    });
  }

  function onPdf() {
    setLabel("pdf");
    startTransition(async () => {
      const pdfMake = await loadPdfMake();
      const doc = {
        content: [
          { text: "Alola Logistics — Reports", style: "title" },
          { text: `Range: ${data.range.from} → ${data.range.to} · Generated ${new Date(data.generatedAt).toLocaleString()} · Currency ${data.currency}`, style: "sub" },
          { text: "KPIs", style: "h2" },
          table(["Metric", "Value"], data.kpis.map((k) => [k.label, k.value])),
          { text: "Monthly revenue", style: "h2" },
          table(["Month", "Revenue", "Count"], data.monthly.map((m) => [m.month, cur(m.revenue, data.currency), String(m.count)])),
          { text: "Revenue by mode", style: "h2" },
          table(["Mode", "Count", "Revenue"], data.byMode.map((m) => [m.key, String(m.count), cur(m.revenue, data.currency)])),
          { text: "Revenue by tier", style: "h2" },
          table(["Tier", "Count", "Revenue"], data.byTier.map((t) => [t.key, String(t.count), cur(t.revenue, data.currency)])),
          { text: "Top lanes", style: "h2" },
          table(["Lane", "Count", "Revenue"], data.byLane.map((l) => [l.key, String(l.count), cur(l.revenue, data.currency)])),
          { text: "Top customers", style: "h2" },
          table(["Customer", "Count", "Revenue"], data.topCustomers.map((c) => [c.key, String(c.count), cur(c.revenue, data.currency)])),
          { text: "Outstanding invoices", style: "h2" },
          table(["Number", "Customer", "Status", "Due", "Total"], data.invoicesOutstanding.map((i) => [i.invoiceNumber, i.customer, i.status, i.dueDate, cur(i.total, data.currency)])),
          { text: "Quote conversion", style: "h2" },
          table(["Metric", "Value"], [["Accepted", String(data.quoteConversion.accepted)], ["Total", String(data.quoteConversion.total)], ["Rate", `${data.quoteConversion.rate}%`]]),
        ],
        styles: {
          title: { fontSize: 18, bold: true, color: "#0f172a" },
          h2: { fontSize: 12, bold: true, margin: [0, 14, 0, 4], color: "#004fba" },
          sub: { fontSize: 9, color: "#64748b" },
        },
        defaultStyle: { fontSize: 10, color: "#1e293b" },
        pageMargins: [36, 36, 36, 36],
      };
      pdfMake.createPdf(doc).download(`alola-report-${data.range.from}.pdf`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-1" onClick={onExcel} disabled={pending}>
        {pending && label === "xlsx" ? <Loader2Icon className="size-3.5 animate-spin" /> : <FileSpreadsheetIcon className="size-3.5" />}
        Export Excel
      </Button>
      <Button variant="outline" size="sm" className="gap-1" onClick={onPdf} disabled={pending}>
        {pending && label === "pdf" ? <Loader2Icon className="size-3.5 animate-spin" /> : <FileTextIcon className="size-3.5" />}
        Export PDF
      </Button>
      <Button variant="outline" size="sm" className="gap-1" onClick={onCsv} disabled={pending}>
        {pending && label === "csv" ? <Loader2Icon className="size-3.5 animate-spin" /> : <FileDownIcon className="size-3.5" />}
        Export CSV
      </Button>
    </div>
  );
}
