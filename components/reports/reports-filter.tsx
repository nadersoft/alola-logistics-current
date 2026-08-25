"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FilterIcon } from "lucide-react";

const MODES = ["", "FCL", "LCL", "AIR", "BULK"];
const STATUSES = ["", "CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS", "DELIVERED", "CANCELLED"];

export function ReportsFilter({ from, to, mode, status }: { from: string; to: string; mode: string; status: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [m, setM] = useState(mode);
  const [s, setS] = useState(status);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (f) params.set("from", f);
    if (t) params.set("to", t);
    if (m) params.set("mode", m);
    if (s) params.set("status", s);
    router.push(`${pathname}?${params.toString()}`);
  }

  const inputCls = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border p-4">
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs text-muted-foreground">From</Label>
        <input id="from" type="date" value={f} onChange={(e) => setF(e.target.value)} className={inputCls} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs text-muted-foreground">To</Label>
        <input id="to" type="date" value={t} onChange={(e) => setT(e.target.value)} className={inputCls} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mode" className="text-xs text-muted-foreground">Mode</Label>
        <select id="mode" value={m} onChange={(e) => setM(e.target.value)} className={inputCls}>
          {MODES.map((mm) => (
            <option key={mm} value={mm}>{mm || "All modes"}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="status" className="text-xs text-muted-foreground">Status</Label>
        <select id="status" value={s} onChange={(e) => setS(e.target.value)} className={inputCls}>
          {STATUSES.map((ss) => (
            <option key={ss} value={ss}>{ss || "All statuses"}</option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" size="sm" className="gap-1">
        <FilterIcon className="size-3.5" />
        Apply
      </Button>
    </form>
  );
}
