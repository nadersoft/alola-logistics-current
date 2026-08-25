"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trackShipment } from "@/lib/actions/tracking";
import { Activity, ArrowRight, Package, Search } from "lucide-react";

/**
 * Real tracking input (ZERO mock): posts to trackShipment server action →
 * Prisma lookup (+ optional Ship24) → redirects to /track/[ref].
 * `light` renders the transparent hero variant vs the white card variant.
 */
export function TrackForm({ placeholder, light = false }: { placeholder: string; light?: boolean }) {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ref.trim()) return;
    const fd = new FormData();
    fd.set("ref", ref);
    startTransition(async () => {
      const res = await trackShipment(fd);
      if (res.ok && res.ref) {
        router.push(`/track/${encodeURIComponent(res.ref)}`);
      } else {
        toast.error(res.error ?? "Tracking failed. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl">
      <div
        className={`relative flex items-center rounded-2xl p-2 shadow-2xl ${
          light ? "glass-panel border-white/20" : "border bg-white shadow-[var(--card-hover-shadow)]"
        }`}
      >
        <div className="pl-4">
          {light ? (
            <Search className="size-5 text-white/50" />
          ) : (
            <Package className="size-5 text-[var(--primary)]" />
          )}
        </div>
        <input
          type="text"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={placeholder}
          aria-label="Tracking reference"
          className={`flex-1 bg-transparent px-4 py-3 text-sm outline-none ${
            light ? "text-white placeholder-white/40" : "text-gray-700"
          }`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:opacity-70 ${
            light ? "bg-white text-[var(--primary)] hover:bg-[var(--alola-slate)]" : "bg-[var(--primary)] text-white hover:bg-[var(--accent)]"
          }`}
        >
          {pending ? (
            <Activity className="size-4 animate-spin" />
          ) : light ? (
            <>
              Track <ArrowRight className="size-4" />
            </>
          ) : (
            <>
              <Search className="size-4" /> Track
            </>
          )}
        </button>
      </div>
    </form>
  );
}
