import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAllSettings } from "@/lib/settings";
import { getString, toSettingMap } from "@/lib/theme";
import { normalizeLocale } from "@/lib/i18n";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { AppTopbar } from "@/components/shell/app-topbar";
import { SessionTimeoutWatcher } from "@/components/auth/session-timeout-watcher";
import { DeveloperFab } from "@/components/admin/developer-fab";

import type { BellNotification } from "@/components/shell/notification-bell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const settings = await getAllSettings();
  const map = toSettingMap(settings);
  const companyName = getString(map, "company.name", "Alola Logistics");
  const cookieLocale = cookies().get("alola_locale")?.value;
  const locale = normalizeLocale(cookieLocale ?? getString(map, "defaults.language", "en"));

  const [recentNotifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, title: true, body: true, type: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);
  const notifications: BellNotification[] = recentNotifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <SessionTimeoutWatcher />
      <DeveloperFab />
      <AppSidebar
        companyName={companyName}
        userName={session.user.name}
        userEmail={session.user.email}
        userRole={session.user.role}
        locale={locale}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar companyName={companyName} notifications={notifications} unread={unreadCount} locale={locale} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
