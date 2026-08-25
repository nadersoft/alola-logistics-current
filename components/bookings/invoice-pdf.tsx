"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, DownloadIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";
import type { QuotePdfCompanyInfo } from "@/components/quotes/quote-pdf";

export type InvoicePdfItem = { description: string; qty: number; unitPrice: number; amount: number };

export type InvoicePdfData = {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxes: number;
  total: number;
  notes?: string | null;
  customerName: string;
  customerEmail?: string | null;
  company: string;
  companyCr: string;
  companyAddress: string;
  items: InvoicePdfItem[];
  companyInfo?: QuotePdfCompanyInfo | null;
};

function buildHeader(data: InvoicePdfData) {
  const ci = data.companyInfo;
  const showLogo = ci?.headerShowLogo ?? true;
  const showName = ci?.headerShowCompanyName ?? true;
  const showAddr = ci?.headerShowAddress ?? true;
  const showPhone = ci?.headerShowPhone ?? false;
  const showEmail = ci?.headerShowEmail ?? false;
  const showWebsite = ci?.headerShowWebsite ?? false;

  const headerCols: unknown[] = [];
  if (showLogo && ci?.logoForPdfUrl) {
    headerCols.push({ image: "logo", width: 120, height: 40, fit: [120, 40] });
  }
  const infoParts: { text: string; style: string }[] = [];
  if (showName) infoParts.push({ text: data.company + "\n", style: "title" });
  if (showAddr && data.companyAddress) infoParts.push({ text: data.companyAddress + "\n", style: "sub" });
  if (data.companyCr) infoParts.push({ text: `CR: ${data.companyCr}\n`, style: "sub" });
  if (showPhone && ci?.phone) infoParts.push({ text: `Phone: ${ci.phone}\n`, style: "sub" });
  if (showEmail && ci?.email) infoParts.push({ text: `Email: ${ci.email}\n`, style: "sub" });
  if (showWebsite && ci?.website) infoParts.push({ text: ci.website, style: "sub" });
  if (infoParts.length > 0) headerCols.push({ text: infoParts });
  if (headerCols.length === 0) return [];

  const widths = (showLogo && ci?.logoForPdfUrl) ? [130, "*"] : ["*"];
  return [{ table: { widths, body: [headerCols] }, layout: "noBorders", margin: [0, 0, 0, 12] }];
}

function buildDoc(data: InvoicePdfData) {
  const cur = data.currency;
  const ci = data.companyInfo;
  const showBank = ci?.footerShowBankInfo ?? false;
  const bankInfo = ci?.bankInfo && typeof ci.bankInfo === "object" ? ci.bankInfo as Record<string, string> : null;
  const images: Record<string, string> = {};
  if (ci?.logoForPdfUrl) images.logo = normalizeLogoUrl(ci.logoForPdfUrl);

  return {
    images,
    content: [
      ...buildHeader(data),
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              {
                text: [
                  { text: "INVOICE\n", style: "invoiceTitle" },
                  { text: `${data.invoiceNumber}\n`, style: "big" },
                  { text: `Issued: ${data.issueDate}\n`, style: "sub" },
                  { text: `Due: ${data.dueDate}`, style: "sub" },
                ],
                alignment: "left",
              },
              {
                text: [
                  { text: "Billed to\n", style: "sub" },
                  { text: `${data.customerName}\n`, style: "med" },
                  { text: data.customerEmail ?? "", style: "sub" },
                ],
                alignment: "right",
              },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 12, 0, 8],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Description", style: "tableHeader" },
              { text: "Qty", style: "tableHeader", alignment: "right" },
              { text: "Unit price", style: "tableHeader", alignment: "right" },
              { text: "Amount", style: "tableHeader", alignment: "right" },
            ],
            ...data.items.map((it) => [
              { text: it.description },
              { text: String(it.qty), alignment: "right" },
              { text: formatCurrency(it.unitPrice, cur), alignment: "right" },
              { text: formatCurrency(it.amount, cur), alignment: "right" },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
      },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            [
              { text: "", border: [false, false, false, false] },
              { text: `Subtotal: ${formatCurrency(data.subtotal, cur)}`, alignment: "right", style: "totals", border: [false, true, false, false] },
            ],
            [
              { text: "", border: [false, false, false, false] },
              { text: `Taxes: ${formatCurrency(data.taxes, cur)}`, alignment: "right", style: "totals", border: [false, false, false, false] },
            ],
            [
              { text: "", border: [false, false, false, false] },
              { text: `TOTAL: ${formatCurrency(data.total, cur)}`, alignment: "right", style: "grandTotal", border: [false, false, false, false] },
            ],
          ],
        },
        margin: [0, 8, 0, 0],
      },
      { text: data.notes ?? "", style: "sub", margin: [0, 10, 0, 0] },
      ...(showBank && bankInfo ? [{
        text: [
          { text: "Bank Details\n", style: "sub" },
          { text: `Bank: ${bankInfo.bankName ?? ""}\n`, style: "sub" },
          { text: `IBAN: ${bankInfo.iban ?? ""}\n`, style: "sub" },
          { text: `SWIFT: ${bankInfo.swift ?? ""}`, style: "sub" },
        ],
        margin: [0, 10, 0, 0],
      }] : []),
      { text: `Status: ${data.status}`, style: "sub", margin: [0, 6, 0, 0] },
    ],
    footer: (currentPage: number, pageCount: number) => {
      if (!(ci?.footerShowPageNumber ?? true)) return "";
      return {
        text: `Page ${currentPage} of ${pageCount}`,
        alignment: "right",
        margin: [0, 10, 40, 0],
        fontSize: 8,
        color: "#94a3b8",
      };
    },
    styles: {
      title: { fontSize: 20, bold: true, color: "#0f172a" },
      invoiceTitle: { fontSize: 13, bold: true, color: "#004fba" },
      big: { fontSize: 16, bold: true },
      med: { fontSize: 11, bold: true },
      sub: { fontSize: 9, color: "#64748b" },
      totals: { fontSize: 11, margin: [0, 4, 0, 0] },
      grandTotal: { fontSize: 13, bold: true, margin: [0, 6, 0, 0], color: "#0f172a" },
      tableHeader: { bold: true, fontSize: 10, color: "#334155", fillColor: "#f1f5f9" },
    },
    defaultStyle: { fontSize: 10, color: "#1e293b" },
  };
}

async function loadPdfMake() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfmakeModule: any = await import("pdfmake/build/pdfmake");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfsModule: any = await import("pdfmake/build/vfs_fonts");
  const pdfMake = pdfmakeModule.default ?? pdfmakeModule;
  const vfs = vfsModule.default ?? vfsModule;
  pdfMake.vfs = vfs.pdfMake?.vfs ?? vfs;
  pdfMake.fonts = {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };
  return pdfMake;
}

async function fetchCompanyInfo(): Promise<QuotePdfCompanyInfo> {
  try {
    const res = await fetch("/api/company-info", { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return {};
}

export function InvoicePdfButton({ data, filename }: { data: InvoicePdfData; filename: string }) {
  const [pending, startTransition] = useTransition();

  function onDownload() {
    startTransition(async () => {
      if (!data.companyInfo) {
        data.companyInfo = await fetchCompanyInfo();
      }
      const pdfMake = await loadPdfMake();
      const doc = buildDoc(data);
      pdfMake.createPdf(doc).download(filename);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onDownload} disabled={pending}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
      PDF
    </Button>
  );
}
