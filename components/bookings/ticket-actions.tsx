"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { replyTicket, setTicketStatus } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    const fd = new FormData();
    fd.set("ticketId", ticketId);
    fd.set("body", body);
    startTransition(async () => {
      const res = await replyTicket(fd);
      if (res.ok) {
        toast.success("Reply sent");
        setBody("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not send reply.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-xl border p-4">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" />
      <Button type="submit" disabled={pending || !body.trim()}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Send reply
      </Button>
    </form>
  );
}

export function TicketStatusSelect({ ticketId, current }: { ticketId: string; current: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(status: string) {
    const fd = new FormData();
    fd.set("ticketId", ticketId);
    fd.set("status", status);
    startTransition(async () => {
      const res = await setTicketStatus(fd);
      if (res.ok) {
        toast.success(`Ticket → ${status}`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Update failed.");
      }
    });
  }

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      disabled={pending}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
    >
      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
