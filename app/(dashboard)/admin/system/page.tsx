import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheckIcon, DatabaseIcon, SettingsIcon, UsersIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const [userCount, customerCount, quoteCount, shipmentCount, voyageCount] = await Promise.all([
    prisma.user.count(),
    prisma.customer.count(),
    prisma.quote.count(),
    prisma.shipment.count(),
    prisma.voyage.count(),
  ]);

  const sections = [
    {
      title: "الأمان والجلسات / Security & Sessions",
      description: "Session timeout, IP monitoring, audit logs.",
      href: "/admin/system/security",
      icon: ShieldCheckIcon,
      color: "text-red-500 bg-red-50 dark:bg-red-900/20",
    },
    {
      title: "النسخ الاحتياطي / Database Backup",
      description: "Export tables as JSON/CSV, view DB stats.",
      href: "/admin/system/backup",
      icon: DatabaseIcon,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "الإعدادات / System Settings",
      description: "Configure system-wide settings and integrations.",
      href: "/admin/settings",
      icon: SettingsIcon,
      color: "text-green-500 bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "المستخدمون / Users",
      description: "Manage user accounts, roles, and permissions.",
      href: "/admin/users",
      icon: UsersIcon,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  const stats = [
    { label: "المستخدمون / Users", value: userCount },
    { label: "العملاء / Customers", value: customerCount },
    { label: "العروض / Quotes", value: quoteCount },
    { label: "الشحنات / Shipments", value: shipmentCount },
    { label: "الرحلات / Voyages", value: voyageCount },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم النظام / System Control</h1>
        <p className="text-sm text-muted-foreground">Central hub for system management and administration.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${s.color}`}>
                  <s.icon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
