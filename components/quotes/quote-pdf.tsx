"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, DownloadIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";

export type QuotePdfSurcharge = { label: string; amount: number };

export type QuotePdfCompanyInfo = {
  logoForPdfUrl?: string | null;
  headerShowLogo?: boolean;
  headerShowCompanyName?: boolean;
  headerShowAddress?: boolean;
  headerShowPhone?: boolean;
  headerShowEmail?: boolean;
  headerShowWebsite?: boolean;
  footerShowTerms?: boolean;
  footerShowBankInfo?: boolean;
  footerShowPageNumber?: boolean;
  footerTermsText?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  commercialReg?: string | null;
  bankInfo?: unknown;
};

export type QuotePdfData = {
  quoteNumber: string;
  status: string;
  validUntil?: string;
  currency: string;
  lane: string;
  mode: string;
  tier: string;
  base: number;
  surcharges: QuotePdfSurcharge[];
  total: number;
  cargo: { label: string; value: string }[];
  customerName: string;
  customerEmail?: string | null;
  company: string;
  companyCr: string;
  companyAddress: string;
  companyInfo?: QuotePdfCompanyInfo | null;
};

function buildHeader(data: QuotePdfData) {
  const ci = data.companyInfo;
  const showLogo = ci?.headerShowLogo ?? true;
  const showName = ci?.headerShowCompanyName ?? true;
  const showAddr = ci?.headerShowAddress ?? true;
  const showPhone = ci?.headerShowPhone ?? false;
  const showEmail = ci?.headerShowEmail ?? false;
  const showWebsite = ci?.headerShowWebsite ?? false;
  const showCr = !!data.companyCr;

  const headerCols: unknown[] = [];

  if (showLogo && ci?.logoForPdfUrl) {
    headerCols.push({
      image: "logo",
      width: 120,
      height: 40,
      fit: [120, 40],
      colSpan: showName || showAddr ? 1 : 0,
    });
  }

  const infoParts: { text: string; style: string }[] = [];
  if (showName) infoParts.push({ text: data.company + "\n", style: "title" });
  if (showAddr && data.companyAddress) infoParts.push({ text: data.companyAddress + "\n", style: "sub" });
  if (showCr) infoParts.push({ text: `CR: ${data.companyCr}\n`, style: "sub" });
  if (showPhone && ci?.phone) infoParts.push({ text: `Phone: ${ci.phone}\n`, style: "sub" });
  if (showEmail && ci?.email) infoParts.push({ text: `Email: ${ci.email}\n`, style: "sub" });
  if (showWebsite && ci?.website) infoParts.push({ text: ci.website, style: "sub" });

  if (infoParts.length > 0) {
    headerCols.push({ text: infoParts, colSpan: 1 });
  }

  if (headerCols.length === 0) return [];

  const widths = (showLogo && ci?.logoForPdfUrl) ? [130, "*"] : ["*"];
  return [{
    table: { widths, body: [headerCols] },
    layout: "noBorders",
    margin: [0, 0, 0, 12],
  }];
}

function buildDoc(data: QuotePdfData) {
  const cur = data.currency;
  const ci = data.companyInfo;
  const showTerms = ci?.footerShowTerms ?? true;
  const termsText = ci?.footerTermsText || "All rates in local currency unless stated. This quotation is an estimate and may vary with actual freight charges, surcharges and exchange rates at time of booking.";

  const images: Record<string, string> = {};
  if (ci?.logoForPdfUrl) {
    images.logo = normalizeLogoUrl(ci.logoForPdfUrl);
  }

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
                  { text: "QUOTATION\n", style: "docTitle" },
                  { text: `${data.quoteNumber}\n`, style: "big" },
                  { text: `Status: ${data.status}\n`, style: "sub" },
                  { text: data.validUntil ? `Valid until: ${data.validUntil}` : "", style: "sub" },
                ],
                alignment: "left",
              },
              {
                text: [
                  { text: "Prepared for\n", style: "sub" },
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
      { text: `Route & service: ${data.lane} · ${data.mode} · ${data.tier}`, style: "sub", margin: [0, 0, 0, 8] },
      ...(data.cargo.length
        ? [
            {
              table: {
                headerRows: 1,
                widths: ["*", "*"],
                body: [
                  [{ text: "Cargo", style: "tableHeader" }, { text: "", style: "tableHeader" }],
                  ...data.cargo.map((c) => [{ text: c.label }, { text: c.value, alignment: "right" }]),
                ],
              },
              layout: "lightHorizontalLines",
              margin: [0, 4, 0, 12],
            },
          ]
        : []),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [
            [{ text: "Cost breakdown", style: "tableHeader" }, { text: "", style: "tableHeader" }],
            [
              { text: "Base cost" },
              { text: formatCurrency(data.base, cur), alignment: "right" },
            ],
            ...data.surcharges.map((s) => [{ text: s.label }, { text: formatCurrency(s.amount, cur), alignment: "right" }]),
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
              { text: `TOTAL: ${formatCurrency(data.total, cur)}`, alignment: "right", style: "grandTotal", border: [false, true, false, false] },
            ],
          ],
        },
        margin: [0, 8, 0, 0],
      },
      ...(showTerms ? [{ text: termsText, style: "foot", margin: [0, 12, 0, 0] }] : []),
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
      docTitle: { fontSize: 13, bold: true, color: "#004fba" },
      big: { fontSize: 16, bold: true },
      med: { fontSize: 11, bold: true },
      sub: { fontSize: 9, color: "#64748b" },
      grandTotal: { fontSize: 13, bold: true, margin: [0, 6, 0, 0], color: "#0f172a" },
      tableHeader: { bold: true, fontSize: 10, color: "#334155", fillColor: "#f1f5f9" },
      foot: { fontSize: 8, color: "#94a3b8", italics: true },
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

export function QuotePdfButton({ data, filename, className }: { data: QuotePdfData; filename: string; className?: string }) {
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
    <Button variant="outline" size="sm" onClick={onDownload} disabled={pending} className={className}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
      PDF
    </Button>
  );
}
