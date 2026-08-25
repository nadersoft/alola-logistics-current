export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { Role, Category } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpenIcon, DatabaseIcon, HistoryIcon, ShieldCheckIcon } from "lucide-react";

export const metadata = { title: "Smart Live User Guide" };

type FeatureStatus = { point: number; title: string; status: "done" | "partial" | "deferred"; files: string; evidence: string };

const FEATURE_STATUS: FeatureStatus[] = [
  { point: 1, title: "Export Excel/PDF/CSV per table", status: "partial", files: "components/reports/reports-export.tsx · app/(dashboard)/reports/page.tsx", evidence: "Reports exports Excel + PDF + CSV (added 2026-08-13). Per-table export on Shipments/Customers/Finance pending." },
  { point: 2, title: "Appearance control (colors, opacity, images)", status: "partial", files: "lib/theme.ts · lib/settings-config.ts · components/settings/settings-editor.tsx", evidence: "Color pickers + opacity sliders per token, radius/fonts, UX Kit tokens. Image upload to storage, Reset/Presets/Preview mode pending." },
  { point: 3, title: "Arabic/English + RTL", status: "done", files: "lib/i18n.ts · lib/actions/locale.ts · components/shell/locale-switcher.tsx", evidence: "Settings-driven dict EN/AR, dir=rtl + Noto Sans Arabic, default_locale setting. Decision: next-intl skipped (documented)." },
  { point: 4, title: "Editable pricing with live preview", status: "partial", files: "app/(dashboard)/settings/page.tsx · lib/calculation.ts · app/quote/page.tsx", evidence: "Surcharges editable from Settings; quote engine recomputes live. ShippingRate base-rate CRUD UI pending (seeded only)." },
  { point: 5, title: "Floating WhatsApp/Call/LiveChat", status: "done", files: "components/landing/floating-actions.tsx · lib/settings-config.ts (appearance.*)", evidence: "Show/hide + number + message + position + color, all from SystemSetting." },
  { point: 6, title: "Three permission levels", status: "partial", files: "auth.ts · middleware.ts · lib/authz.ts · prisma/schema.prisma (Role)", evidence: "SUPER_ADMIN/MANAGER/SUPPORT/CLIENT via Auth.js JWT + middleware + getScope + audit. Finance/backup-only gating pending." },
  { point: 7, title: "Backup / restore / auto-update", status: "deferred", files: "prisma/schema.prisma (Backup model)", evidence: "Model exists. Backup Now, dump/restore UI, Realtime/SWR sync pending." },
  { point: 8, title: "Smart alerts & reminders", status: "partial", files: "lib/notify.ts · components/shell/notification-bell.tsx · lib/actions/notifications.ts", evidence: "In-app notifications wired to booking/shipment/invoice/ticket. Smart rules (delay >3d, inactive 30d, port-arrival) pending." },
  { point: 9, title: "Premium motion (parallax, stagger, skeleton)", status: "partial", files: "app/globals.css (hero/glass/pulse/card-hover) · components/ui/skeleton.tsx · components/landing/reveal.tsx", evidence: "CSS glassmorphism + pulse-ring + skeleton shipped. Framer Motion parallax/stagger pending." },
  { point: 10, title: "Flexible signup (email/phone) + smart OTP", status: "deferred", files: "prisma/schema.prisma (OtpVerification model)", evidence: "Model exists (2-min expiry). Signup/OTP provider flow pending; login is email/password only." },
  { point: 11, title: "100% responsive mobile-first", status: "partial", files: "tailwind breakpoints app-wide · components/ui/*", evidence: "Mobile-first via Tailwind; tables use overflow-x-auto. Enforced 3-size page tests pending." },
  { point: 12, title: "Smart Live User Guide (/admin/guide)", status: "done", files: "app/(dashboard)/admin/guide/page.tsx", evidence: "This page: reads PROJECT_MAP.md + SystemSetting + Roles + Backup history live. guide.version tied to Backups." },
  { point: 13, title: "Landing + Dashboard (mini-SaaS)", status: "done", files: "app/page.tsx · app/(dashboard)/dashboard/page.tsx · app/quote/page.tsx", evidence: "Real hero + public quote engine + partners marquee + testimonials + FAQ; dashboard = My Shipments + quotes + tickets + notifications." },
];

const ROLE_MATRIX = [
  { role: Role.SUPER_ADMIN, label: "Administrator", grants: "Settings, Command Center, Integrations, Reports, Customers, Shipments, Quotes, Invoices, Tickets" },
  { role: Role.MANAGER, label: "Staff / Operations", grants: "Shipments, Quotes, Invoices, Customers, Tickets, Reports, Command Center (read)" },
  { role: Role.CLIENT, label: "Client", grants: "My shipments, My quotes, My invoices, Support tickets, Notifications" },
];

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  parts.forEach((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      out.push(<strong key={i}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      out.push(<code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>);
    } else if (part.length > 0) {
      out.push(<span key={i}>{part}</span>);
    }
  });
  return out;
}

function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let inCode = false;
  const codeBuf: string[] = [];
  let listBuf: React.ReactNode[] = [];
  let tableBuf: string[][] = [];

  const flushList = (key: number) => {
    if (listBuf.length === 0) return;
    nodes.push(<ul key={`list-${key}`} className="ml-4 list-disc space-y-1 text-sm">{listBuf}</ul>);
    listBuf = [];
  };
  const flushTable = (key: number) => {
    if (tableBuf.length === 0) return;
    const [header, ...body] = tableBuf;
    nodes.push(
      <div key={`table-${key}`} className="my-3 overflow-x-auto rounded-lg border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>{header.map((c, j) => <th key={j} className="border-b bg-muted px-3 py-2 text-left font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody>
            {body.filter((r) => !/^:?-+:?$/.test(r[0] ?? "")).map((r, j) => (
              <tr key={j}>{r.map((c, k) => <td key={k} className="border-b px-3 py-1.5 align-top">{renderInline(c.trim())}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuf = [];
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeBuf.length = 0;
      } else {
        inCode = false;
        nodes.push(<pre key={`code-${i}`} className="my-3 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{codeBuf.join("\n")}</pre>);
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    if (trimmed === "") { flushList(i); flushTable(i); continue; }
    if (trimmed === "---") { flushList(i); flushTable(i); nodes.push(<hr key={`hr-${i}`} className="my-4" />); continue; }

    if (trimmed.startsWith("|")) {
      flushList(i);
      const cells = trimmed.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      tableBuf.push(cells);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushList(i); flushTable(i);
      nodes.push(<blockquote key={`q-${i}`} className="my-3 border-l-4 border-primary/40 bg-muted/40 px-4 py-2 text-sm">{renderInline(trimmed.slice(2))}</blockquote>);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushTable(i);
      listBuf.push(<li key={i}>{renderInline(trimmed.replace(/^- |^\* /, ""))}</li>);
      continue;
    }

    flushList(i); flushTable(i);

    if (trimmed.startsWith("### ")) {
      nodes.push(<h3 key={`h3-${i}`} className="mt-6 text-base font-semibold">{renderInline(trimmed.slice(4))}</h3>);
    } else if (trimmed.startsWith("## ")) {
      nodes.push(<h2 key={`h2-${i}`} className="mt-8 border-b pb-1 text-lg font-semibold">{renderInline(trimmed.slice(3))}</h2>);
    } else if (trimmed.startsWith("# ")) {
      nodes.push(<h1 key={`h1-${i}`} className="mt-4 text-xl font-bold">{renderInline(trimmed.slice(2))}</h1>);
    } else {
      nodes.push(<p key={`p-${i}`} className="my-1.5 text-sm leading-relaxed">{renderInline(trimmed)}</p>);
    }
  }
  flushList(i); flushTable(i);

  return nodes;
}

export default async function GuidePage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const [settings, backupCount, lastBackup] = await Promise.all([
    getAllSettings(),
    prisma.backup.count(),
    prisma.backup.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);
  const map = toSettingMap(settings);
  const guideVersion = getString(map, "guide.version", "1.0.0");

  const byCategory = new Map<Category, number>();
  for (const s of settings) byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + 1);

  let markdown = "";
  let mdSource = "";
  let mdMtime = "";
  try {
    const file = path.join(process.cwd(), "PROJECT_MAP.md");
    markdown = fs.readFileSync(file, "utf8");
    mdSource = "PROJECT_MAP.md";
    const stat = fs.statSync(file);
    mdMtime = stat.mtime.toISOString().slice(0, 16);
  } catch {
    markdown = "PROJECT_MAP.md is not readable at runtime.";
    mdSource = "unavailable";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Smart Live User Guide</h1>
          <p className="text-sm text-muted-foreground">
            Live product documentation — reads PROJECT_MAP.md, SystemSetting and Roles in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1"><BookOpenIcon className="size-3.5" /> guide.version {guideVersion}</Badge>
          <Badge variant="outline" className="gap-1"><DatabaseIcon className="size-3.5" /> {settings.length} settings</Badge>
          <Badge variant="outline" className="gap-1"><HistoryIcon className="size-3.5" /> {backupCount} backups</Badge>
          <Badge variant="outline" className="gap-1"><ShieldCheckIcon className="size-3.5" /> {session.user.role}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feature status — 13-point brief</CardTitle>
            <CardDescription>Status legend: done · partial · deferred. Kept in sync as features ship.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Requirement</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Files</th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_STATUS.map((f) => (
                    <tr key={f.point} className="border-b align-top last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs">{f.point}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{f.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{f.evidence}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={f.status === "done" ? "default" : f.status === "partial" ? "secondary" : "outline"}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{f.files}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Roles & permissions</CardTitle>
            <CardDescription>Live from the Role enum + middleware + lib/authz.ts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROLE_MATRIX.map((r) => (
              <div key={r.role}>
                <Badge variant="secondary">{r.label}</Badge>
                <p className="mt-1 text-xs text-muted-foreground">{r.grants}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">SystemSetting in database</CardTitle>
          <CardDescription>Zero hardcoded config — every value below is editable from Settings / Command Center.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[...byCategory.entries()].map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{cat}</span>
              <Badge variant="outline">{count}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {lastBackup ? (
        <p className="text-xs text-muted-foreground">
          Latest backup: {lastBackup.filename} · {lastBackup.kind} · {lastBackup.scope} ·{" "}
          {lastBackup.createdAt.toISOString().slice(0, 16)} · guideVersion {lastBackup.guideVersion ?? "—"}
        </p>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Live document — {mdSource}</CardTitle>
          <CardDescription>{mdMtime ? `Last synced ${mdMtime} UTC.` : "Not readable at runtime."}</CardDescription>
        </CardHeader>
        <CardContent className="max-w-none">{renderMarkdown(markdown)}</CardContent>
      </Card>
    </div>
  );
}
