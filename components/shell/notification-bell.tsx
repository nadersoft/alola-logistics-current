"use client";

import { useEffect, useState } from "react";
import { BellIcon, CheckCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

export type BellNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell({ notifications, unread }: { notifications: BellNotification[]; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: live } = useSWR<{ ok: boolean; items: BellNotification[]; unread: number }>(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  );

  const liveNotifications = live?.ok ? live.items : notifications;
  const liveUnread = live?.ok ? live.unread : unread;

  useEffect(() => {
    if (live?.ok) router.refresh();
  }, [live?.unread, live?.ok, router]);

  async function onOpen() {
    setOpen((o) => !o);
    if (!open) {
      router.refresh();
    }
  }

  async function onRead(id: string) {
    await markNotificationRead(id);
    router.refresh();
  }

  async function onReadAll() {
    await markAllNotificationsRead();
    toast.success("All notifications read");
    router.refresh();
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={onOpen} className="relative" aria-label="Notifications">
        <BellIcon className="size-4" />
        {liveUnread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {liveUnread > 9 ? "9+" : liveUnread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <>
          <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="Close" />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-sm font-medium">Notifications</p>
              {unread > 0 ? (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onReadAll}>
                  <CheckCheckIcon className="size-3.5" />
                  Mark all read
                </Button>
              ) : null}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {liveNotifications.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">You are all caught up.</p>
              ) : (
                liveNotifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onRead(n.id)}
                    className={`block w-full border-b px-3 py-2.5 text-left last:border-0 hover:bg-muted/60 ${
                      n.readAt ? "" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    {!n.readAt ? <span className="mt-1 inline-block size-1.5 rounded-full bg-primary" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
