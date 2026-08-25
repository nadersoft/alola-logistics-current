"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  CableIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  LifeBuoyIcon,
  PackageIcon,
  ReceiptIcon,
  WalletIcon,
  SettingsIcon,
  UsersIcon,
  BarChart3Icon,
  BookOpenIcon,
  UserRoundIcon,
  ShieldCheckIcon,
  DatabaseIcon,
} from "lucide-react";
import { UserMenu } from "@/components/shell/user-menu";
import { t, type Dict, type Locale } from "@/lib/i18n";

type NavItemDef = { href: string; label: keyof Dict; icon: typeof LayoutDashboardIcon };

const MAIN_NAV: NavItemDef[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboardIcon },
  { href: "/shipments", label: "nav.shipments", icon: PackageIcon },
  { href: "/quotes", label: "nav.quotes", icon: FileTextIcon },
  { href: "/invoices", label: "nav.invoices", icon: ReceiptIcon },
  { href: "/wallet", label: "nav.wallet", icon: WalletIcon },
  { href: "/customers", label: "nav.customers", icon: UsersIcon },
  { href: "/support", label: "nav.support", icon: LifeBuoyIcon },
  { href: "/reports", label: "nav.reports", icon: BarChart3Icon },
];

const CLIENT_NAV: NavItemDef[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboardIcon },
  { href: "/shipments", label: "nav.myShipments", icon: PackageIcon },
  { href: "/quotes", label: "nav.myQuotes", icon: FileTextIcon },
  { href: "/invoices", label: "nav.myInvoices", icon: ReceiptIcon },
  { href: "/wallet", label: "nav.wallet", icon: WalletIcon },
  { href: "/support", label: "nav.support", icon: LifeBuoyIcon },
  { href: "/account", label: "nav.account", icon: UserRoundIcon },
];

const CONFIG_NAV: NavItemDef[] = [
  { href: "/admin/pricing", label: "nav.pricing", icon: PackageIcon },
  { href: "/admin/voyages", label: "nav.voyages", icon: PackageIcon },
  { href: "/admin/users", label: "nav.users", icon: UsersIcon },
  { href: "/admin/settings", label: "nav.masterData", icon: SettingsIcon },
  { href: "/admin/settings/registration-builder", label: "nav.registrationBuilder", icon: FileTextIcon },
  { href: "/admin/cms", label: "nav.websiteBuilder", icon: LayoutTemplateIcon },
  { href: "/admin/website-builder", label: "nav.websiteContent", icon: LayoutTemplateIcon },
  { href: "/admin/document-builder", label: "nav.documentBuilder", icon: FileTextIcon },
  { href: "/admin/customers/tracking", label: "nav.customerTracking", icon: UsersIcon },
  { href: "/settings", label: "nav.settings", icon: SettingsIcon },
  { href: "/integrations", label: "nav.integrations", icon: CableIcon },
  { href: "/admin/command-center", label: "nav.commandCenter", icon: LayoutDashboardIcon },
  { href: "/admin/system", label: "nav.systemControl", icon: SettingsIcon },
  { href: "/admin/system/security", label: "nav.security", icon: ShieldCheckIcon },
  { href: "/admin/system/backup", label: "nav.backup", icon: DatabaseIcon },
  { href: "/admin/guide", label: "nav.liveGuide", icon: BookOpenIcon },
];

export function AppSidebar({
  companyName,
  userName,
  userEmail,
  userRole,
  locale,
}: {
  companyName: string;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  locale: Locale;
}) {
  const pathname = usePathname();
  const isClient = userRole === "CLIENT";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = isClient ? CLIENT_NAV : MAIN_NAV;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          A
        </div>
        <span className="truncate text-sm font-semibold">{companyName}</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <p className="px-2 pb-1 pt-2 text-[0.65rem] font-medium uppercase tracking-wider text-sidebar-foreground/50">
          {isClient ? t(locale, "nav.account") : t(locale, "nav.workspace")}
        </p>
        {nav.map((item) => (
          <NavItem key={item.href} href={item.href} label={t(locale, item.label)} icon={item.icon} active={isActive(item.href)} />
        ))}
        {!isClient ? (
          <>
            <p className="px-2 pb-1 pt-4 text-[0.65rem] font-medium uppercase tracking-wider text-sidebar-foreground/50">
              {t(locale, "nav.configuration")}
            </p>
            {CONFIG_NAV.map((item) => (
              <NavItem key={item.href} href={item.href} label={t(locale, item.label)} icon={item.icon} active={isActive(item.href)} />
            ))}
          </>
        ) : null}
      </nav>

      <div className="border-t p-2">
        <UserMenu userName={userName} userEmail={userEmail} userRole={userRole} />
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
