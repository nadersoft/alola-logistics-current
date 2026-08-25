"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateShipmentStatus } from "@/lib/actions/bookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon } from "lucide-react";

const STATUSES = ["CREATED", "PICKED_UP", "IN_TRANSIT", "CUSTOMS", "DELIVERED", "CANCELLED"];

export function ShipmentStatusForm({ shipmentId, current }: { shipmentId: string; current: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("shipmentId", shipmentId);
    fd.set("status", status);
    fd.set("location", location);
    fd.set("note", note);
    startTransition(async () => {
      const res = await updateShipmentStatus(fd);
      if (res.ok) {
        toast.success("Shipment status updated");
        setLocation("");
        setNote("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Update failed.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border p-4">
      <Label>Advance status</Label>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="loc">Location</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Jeddah, SA" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="n">Note</Label>
          <Input id="n" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        Save status
      </Button>
    </form>
  );
}
