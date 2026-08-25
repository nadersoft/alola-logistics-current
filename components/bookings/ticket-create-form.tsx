"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createTicket } from "@/lib/actions/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";

export function TicketCreateForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("subject", subject);
    fd.set("message", message);
    startTransition(async () => {
      const res = await createTicket(fd);
      if (res.ok) {
        toast.success(`Ticket ${res.ticketNumber} opened`);
        setSubject("");
        setMessage("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not open ticket.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <Label htmlFor="subj">Subject</Label>
        <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What can we help with?" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="msg">Message</Label>
        <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the issue…" required />
      </div>
      <Button type="submit" disabled={pending || !subject.trim() || !message.trim()}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Open ticket
      </Button>
    </form>
  );
}
