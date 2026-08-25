"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { createTicket } from "@/lib/actions/tickets";
import { Loader2, Send } from "lucide-react";

const inputCls =
  "w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) fd.set(k, v);
    startTransition(async () => {
      const res = await createTicket(fd);
      if (res.ok && res.number) {
        setDone(res.number);
        toast.success(`Ticket ${res.number} created`);
      } else {
        toast.error(res.error ?? "Failed to send your message.");
      }
    });
  }

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-3xl border bg-white p-10 text-center shadow-xl">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-100">
          <Send className="size-7 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-[var(--alola-dark)]">Message received</h3>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Your support ticket <span className="font-mono font-semibold text-[var(--primary)]">{done}</span> has
          been created. Our team will get back to you within a few hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-1 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="cf-name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="cf-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputCls}
            placeholder="you@company.com"
          />
        </div>
      </div>
      <div>
        <label htmlFor="cf-subject" className="mb-1 block text-sm font-medium text-gray-700">
          Subject
        </label>
        <input
          id="cf-subject"
          required
          value={form.subject}
          onChange={(e) => set("subject", e.target.value)}
          className={inputCls}
          placeholder="How can we help?"
        />
      </div>
      <div>
        <label htmlFor="cf-message" className="mb-1 block text-sm font-medium text-gray-700">
          Message
        </label>
        <textarea
          id="cf-message"
          required
          rows={4}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          className={`${inputCls} resize-none`}
          placeholder="Tell us about your shipment..."
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3.5 font-semibold text-white transition-all hover:bg-[var(--accent)] disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send Message
      </button>
    </form>
  );
}
