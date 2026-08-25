import { ThemeToggle } from "@/components/shell/theme-toggle";
import { NotificationBell, type BellNotification } from "@/components/shell/notification-bell";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import type { Locale } from "@/lib/i18n";

export function AppTopbar({
  companyName,
  notifications = [],
  unread = 0,
  locale = "en",
}: {
  companyName: string;
  notifications?: BellNotification[];
  unread?: number;
  locale?: Locale;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <p className="text-sm font-medium text-muted-foreground">
        <span className="text-foreground">{companyName}</span>
      </p>
      <div className="flex items-center gap-2">
        <LocaleSwitcher locale={locale} />
        <NotificationBell notifications={notifications} unread={unread} />
        <ThemeToggle />
      </div>
    </header>
  );
}
