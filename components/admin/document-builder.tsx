"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SaveIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertCompanyInfo } from "@/lib/actions/company-info";
import { upsertDocumentTemplate } from "@/lib/actions/doc-templates";
import { LogoUploader } from "@/components/admin/logo-uploader";
import { normalizeLogoUrl } from "@/lib/utils/logo-helpers";

type CompanyInfoData = {
  id?: string;
  name?: string | null;
  nameAr?: string | null;
  logoUrl?: string | null;
  logoForPdfUrl?: string | null;
  address?: string | null;
  addressAr?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  commercialReg?: string | null;
  headerShowLogo?: boolean;
  headerShowCompanyName?: boolean;
  headerShowAddress?: boolean;
  headerShowPhone?: boolean;
  headerShowEmail?: boolean;
  headerShowWebsite?: boolean;
  footerShowTerms?: boolean;
  footerShowBankInfo?: boolean;
  footerShowSignature?: boolean;
  footerShowPageNumber?: boolean;
  footerTermsText?: string | null;
  footerTermsTextAr?: string | null;
  bankInfo?: unknown;
};

type TemplateData = {
  id: string;
  type: string;
  name: string;
  nameAr: string | null;
  isActive: boolean;
  headerSettings: string;
  footerSettings: string;
  bodySettings: string | null;
};

const TEMPLATE_TABS: Record<string, string> = {
  QUOTE: "Quote",
  INVOICE: "Invoice",
  BOOKING_CONFIRMATION: "Booking",
  BILL_OF_LADING: "BOL",
  SHIPMENT_ORDER: "Shipment Order",
  DELIVERY_ORDER: "Delivery Order",
};

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export function DocumentBuilder({
  companyInfo: initInfo,
  templates: initTemplates,
}: {
  companyInfo: CompanyInfoData | null;
  templates: TemplateData[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("company");

  const [hdr, setHdr] = useState({
    logo: initInfo?.headerShowLogo ?? true,
    companyName: initInfo?.headerShowCompanyName ?? true,
    address: initInfo?.headerShowAddress ?? true,
    phone: initInfo?.headerShowPhone ?? true,
    email: initInfo?.headerShowEmail ?? true,
    website: initInfo?.headerShowWebsite ?? false,
  });
  const [ftr, setFtr] = useState({
    terms: initInfo?.footerShowTerms ?? true,
    bankInfo: initInfo?.footerShowBankInfo ?? false,
    signature: initInfo?.footerShowSignature ?? true,
    pageNumber: initInfo?.footerShowPageNumber ?? true,
  });
  const [bankJson, setBankJson] = useState(() => {
    const bi = initInfo?.bankInfo;
    if (bi && typeof bi === "object") return JSON.stringify(bi, null, 2);
    return '{"bankName":"","iban":"","swift":""}';
  });
  const [logoUrl, setLogoUrl] = useState(normalizeLogoUrl(initInfo?.logoUrl) || "");
  const [logoForPdfUrl, setLogoForPdfUrl] = useState(normalizeLogoUrl(initInfo?.logoForPdfUrl) || "");

  const saveCompany = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const [k, v] of Object.entries(hdr)) {
      fd.set(`headerShow${k.charAt(0).toUpperCase() + k.slice(1)}`, String(v));
    }
    for (const [k, v] of Object.entries(ftr)) {
      fd.set(`footerShow${k.charAt(0).toUpperCase() + k.slice(1)}`, String(v));
    }
    fd.set("bankInfo", bankJson);
    fd.set("logoUrl", logoUrl);
    fd.set("logoForPdfUrl", logoForPdfUrl);
    startTransition(async () => {
      const res = await upsertCompanyInfo(fd);
      if (!res.ok) { toast.error(res.error ?? "Failed"); return; }
      toast.success("Company info saved");
      router.refresh();
    });
  }, [hdr, ftr, bankJson, logoUrl, logoForPdfUrl, router]);

  function saveTemplate(type: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const layout = fd.get("headerSettings_layout") as string || "logo_left";
    const showLogo = fd.get("hs_showLogo") === "on";
    const showCompanyName = fd.get("hs_showCompanyName") === "on";
    const showAddress = fd.get("hs_showAddress") === "on";
    const showPhone = fd.get("hs_showPhone") === "on";
    const showEmail = fd.get("hs_showEmail") === "on";
    const showWebsite = fd.get("hs_showWebsite") === "on";
    const showTerms = fd.get("fs_showTerms") === "on";
    const showBankInfo = fd.get("fs_showBankInfo") === "on";
    const showSignature = fd.get("fs_showSignature") === "on";
    const showPageNumber = fd.get("fs_showPageNumber") === "on";
    const customText = String(fd.get("footerSettings_customText") ?? "");

    fd.set("headerSettings", JSON.stringify({ layout, showLogo, showCompanyName, showAddress, showPhone, showEmail, showWebsite }));
    fd.set("footerSettings", JSON.stringify({ showTerms, showBankInfo, showSignature, showPageNumber, customText }));

    startTransition(async () => {
      const res = await upsertDocumentTemplate(type, fd);
      if (!res.ok) { toast.error(res.error ?? "Failed"); return; }
      toast.success(`${TEMPLATE_TABS[type] ?? type} template saved`);
      router.refresh();
    });
  }

  function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
    return (
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
        <Label className="text-sm cursor-pointer" onClick={() => onCheckedChange(!checked)}>{label}</Label>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="company">Company Info</TabsTrigger>
        {initTemplates.map((t) => (
          <TabsTrigger key={t.type} value={t.type}>{TEMPLATE_TABS[t.type] ?? t.type}</TabsTrigger>
        ))}
      </TabsList>

      {/* ========== COMPANY INFO ========== */}
      <TabsContent value="company">
        <form onSubmit={saveCompany}>
          <Card>
            <CardHeader>
              <CardTitle>Company Identity</CardTitle>
              <CardDescription>Displayed on all documents and the public website.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company Name (EN)</Label>
                  <Input name="name" defaultValue={initInfo?.name ?? "ALOLA LOGISTICS"} />
                </div>
                <div className="space-y-1.5">
                  <Label>Company Name (AR)</Label>
                  <Input name="nameAr" defaultValue={initInfo?.nameAr ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Logo (Website)</Label>
                  <LogoUploader
                    currentUrl={logoUrl}
                    onUpload={(url) => setLogoUrl(url)}
                    type="company"
                    label="Upload Website Logo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Logo (PDF / high-res)</Label>
                  <LogoUploader
                    currentUrl={logoForPdfUrl}
                    onUpload={(url) => setLogoForPdfUrl(url)}
                    type="company"
                    label="Upload PDF Logo"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Address (EN)</Label>
                  <Input name="address" defaultValue={initInfo?.address ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Address (AR)</Label>
                  <Input name="addressAr" defaultValue={initInfo?.addressAr ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input name="city" defaultValue={initInfo?.city ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input name="country" defaultValue={initInfo?.country ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input name="website" defaultValue={initInfo?.website ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={initInfo?.phone ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone 2</Label>
                  <Input name="phone2" defaultValue={initInfo?.phone2 ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input name="email" type="email" defaultValue={initInfo?.email ?? ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tax Number</Label>
                  <Input name="taxNumber" defaultValue={initInfo?.taxNumber ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label>Commercial Registration</Label>
                  <Input name="commercialReg" defaultValue={initInfo?.commercialReg ?? ""} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Document Header Options</CardTitle>
              <CardDescription>Control what appears in the header of all printed documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Toggle label="Show Logo" checked={hdr.logo} onCheckedChange={(v) => setHdr({ ...hdr, logo: v })} />
                <Toggle label="Show Company Name" checked={hdr.companyName} onCheckedChange={(v) => setHdr({ ...hdr, companyName: v })} />
                <Toggle label="Show Address" checked={hdr.address} onCheckedChange={(v) => setHdr({ ...hdr, address: v })} />
                <Toggle label="Show Phone" checked={hdr.phone} onCheckedChange={(v) => setHdr({ ...hdr, phone: v })} />
                <Toggle label="Show Email" checked={hdr.email} onCheckedChange={(v) => setHdr({ ...hdr, email: v })} />
                <Toggle label="Show Website" checked={hdr.website} onCheckedChange={(v) => setHdr({ ...hdr, website: v })} />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Document Footer Options</CardTitle>
              <CardDescription>Control what appears in the footer of all printed documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Toggle label="Show Terms & Conditions" checked={ftr.terms} onCheckedChange={(v) => setFtr({ ...ftr, terms: v })} />
                <Toggle label="Show Bank Info" checked={ftr.bankInfo} onCheckedChange={(v) => setFtr({ ...ftr, bankInfo: v })} />
                <Toggle label="Show Signature Line" checked={ftr.signature} onCheckedChange={(v) => setFtr({ ...ftr, signature: v })} />
                <Toggle label="Show Page Number" checked={ftr.pageNumber} onCheckedChange={(v) => setFtr({ ...ftr, pageNumber: v })} />
              </div>
              <div className="space-y-1.5">
                <Label>Footer Terms (EN)</Label>
                <Textarea name="footerTermsText" rows={3} defaultValue={initInfo?.footerTermsText ?? ""} placeholder="This quote is valid for 24 hours..." />
              </div>
              <div className="space-y-1.5">
                <Label>Footer Terms (AR)</Label>
                <Textarea name="footerTermsTextAr" rows={3} defaultValue={initInfo?.footerTermsTextAr ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Info (JSON)</Label>
                <Textarea rows={3} value={bankJson} onChange={(e) => setBankJson(e.target.value)} placeholder='{"bankName":"...", "iban":"...", "swift":"..."}' />
              </div>
            </CardContent>
          </Card>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={pending} className="gap-1">
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Save Company Info
            </Button>
          </div>
        </form>
      </TabsContent>

      {/* ========== DOCUMENT TEMPLATES ========== */}
      {initTemplates.map((tmpl) => {
        const hdrDefaults = parseJson<{ layout?: string; showLogo?: boolean; showCompanyName?: boolean; showAddress?: boolean; showPhone?: boolean; showEmail?: boolean; showWebsite?: boolean }>(tmpl.headerSettings, {});
        const ftrDefaults = parseJson<{ showTerms?: boolean; showBankInfo?: boolean; showSignature?: boolean; showPageNumber?: boolean; customText?: string }>(tmpl.footerSettings, {});

        return (
          <TabsContent key={tmpl.type} value={tmpl.type}>
            <TemplateTab tmpl={tmpl} hdrDefaults={hdrDefaults} ftrDefaults={ftrDefaults} onSave={saveTemplate} pending={pending} />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function TemplateTab({
  tmpl,
  hdrDefaults,
  ftrDefaults,
  onSave,
  pending,
}: {
  tmpl: TemplateData;
  hdrDefaults: Record<string, unknown>;
  ftrDefaults: Record<string, unknown>;
  onSave: (type: string, e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  const [layout, setLayout] = useState(String(hdrDefaults.layout ?? "logo_left"));
  const [hs, setHs] = useState({
    showLogo: Boolean(hdrDefaults.showLogo ?? true),
    showCompanyName: Boolean(hdrDefaults.showCompanyName ?? true),
    showAddress: Boolean(hdrDefaults.showAddress ?? true),
    showPhone: Boolean(hdrDefaults.showPhone ?? true),
    showEmail: Boolean(hdrDefaults.showEmail ?? false),
    showWebsite: Boolean(hdrDefaults.showWebsite ?? false),
  });
  const [fs, setFs] = useState({
    showTerms: Boolean(ftrDefaults.showTerms ?? false),
    showBankInfo: Boolean(ftrDefaults.showBankInfo ?? false),
    showSignature: Boolean(ftrDefaults.showSignature ?? true),
    showPageNumber: Boolean(ftrDefaults.showPageNumber ?? true),
  });

  return (
    <form onSubmit={(e) => onSave(tmpl.type, e)}>
      <Card>
        <CardHeader>
          <CardTitle>{TEMPLATE_TABS[tmpl.type] ?? tmpl.type} Template</CardTitle>
          <CardDescription>Configure header and footer for {tmpl.name} documents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input name="name" defaultValue={tmpl.name} />
            </div>
            <div className="space-y-1.5">
              <Label>Template Name (AR)</Label>
              <Input name="nameAr" defaultValue={tmpl.nameAr ?? ""} />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Header Overrides</h4>
            <div className="space-y-2">
              <input type="hidden" name="headerSettings_layout" value={layout} />
              <div className="space-y-1.5">
                <Label>Layout</Label>
                <Select value={layout} onValueChange={setLayout}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo_left">Logo Left + Info Right</SelectItem>
                    <SelectItem value="logo_center">Logo Center</SelectItem>
                    <SelectItem value="info_only">Info Only (no logo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries({
                  showLogo: "Logo",
                  showCompanyName: "Company Name",
                  showAddress: "Address",
                  showPhone: "Phone",
                  showEmail: "Email",
                  showWebsite: "Website",
                } as const).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <input type="checkbox" name={`hs_${key}`} className="h-4 w-4 rounded" defaultChecked={hs[key as keyof typeof hs]} onChange={(e) => setHs({ ...hs, [key]: e.target.checked })} />
                    <Label className="text-xs">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Footer Overrides</h4>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries({
                showTerms: "Terms",
                showBankInfo: "Bank Info",
                showSignature: "Signature",
                showPageNumber: "Page Number",
              } as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <input type="checkbox" name={`fs_${key}`} className="h-4 w-4 rounded" defaultChecked={fs[key as keyof typeof fs]} onChange={(e) => setFs({ ...fs, [key]: e.target.checked })} />
                  <Label className="text-xs">{label}</Label>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Custom Footer Text</Label>
              <Textarea name="footerSettings_customText" rows={2} defaultValue={String(ftrDefaults.customText ?? "")} />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending} className="gap-1">
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Save {TEMPLATE_TABS[tmpl.type] ?? tmpl.type} Template
        </Button>
      </div>
    </form>
  );
}
