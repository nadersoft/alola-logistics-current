"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Ship, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createVoyage, updateVoyage, deleteVoyage, toggleVoyageActive } from "@/lib/actions/voyages";

export type PortOption = { id: string; code: string; name: string; type: string };

export type VoyageRow = {
  id: string;
  vesselName: string;
  voyageNumber: string;
  departureDate: Date;
  cutOffDate: Date;
  arrivalDate: Date;
  voyageType: string;
  transitTime: number;
  shippingLine: string;
  isActive: boolean;
  showOnCalculator: boolean;
  originPortCode: string;
  originPortName: string;
  destinationPortCode: string;
  destinationPortName: string;
  createdAt: Date;
};

const VOYAGE_TYPES = [
  { value: "direct", label: "مباشر / Direct" },
  { value: "transit", label: "ترانزيت / Transit" },
  { value: "feeder", label: "فيدر / Feeder" },
];

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function VoyageManager({ voyages, ports }: { voyages: VoyageRow[]; ports: PortOption[] }) {
  const [pending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterDestination, setFilterDestination] = useState("");

  const seaPorts = ports.filter((p) => p.type === "SEA" || p.type === "AIR");

  function openCreate() {
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(v: VoyageRow) {
    setEditingId(v.id);
    setDialogOpen(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const action = editingId ? updateVoyage : createVoyage;
      if (editingId) fd.set("id", editingId);
      const res = await action(fd);
      if (res.ok) {
        toast.success(editingId ? "Voyage updated" : "Voyage created");
        setDialogOpen(false);
      } else {
        toast.error(res.error ?? "Failed to save voyage.");
      }
    });
  }

  function onDelete(id: string) {
    if (!confirm("Delete this voyage?")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await deleteVoyage(fd);
      if (res.ok) toast.success("Voyage deleted");
      else toast.error(res.error ?? "Failed to delete.");
    });
  }

  function onToggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("value", String(!current));
      const res = await toggleVoyageActive(fd);
      if (res.ok) toast.success(current ? "Voyage deactivated" : "Voyage activated");
      else toast.error(res.error ?? "Failed to toggle.");
    });
  }

  const filtered = voyages.filter((v) => {
    if (filterOrigin && v.originPortCode !== filterOrigin) return false;
    if (filterDestination && v.destinationPortCode !== filterDestination) return false;
    return true;
  });

  const editing = editingId ? voyages.find((v) => v.id === editingId) : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" /> إضافة رحلة / Add Voyage
        </Button>
        <Select value={filterOrigin} onValueChange={setFilterOrigin}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Origin port..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All origins</SelectItem>
            {seaPorts.map((p) => (
              <SelectItem key={p.id} value={p.code}>{p.code} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDestination} onValueChange={setFilterDestination}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Destination port..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All destinations</SelectItem>
            {seaPorts.map((p) => (
              <SelectItem key={p.id} value={p.code}>{p.code} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} voyages</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Vessel</th>
              <th className="px-3 py-2 font-medium">Voyage #</th>
              <th className="px-3 py-2 font-medium">Route</th>
              <th className="px-3 py-2 font-medium">Departure</th>
              <th className="px-3 py-2 font-medium">Cut-off</th>
              <th className="px-3 py-2 font-medium">Arrival</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Line</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">No voyages found.</td></tr>
            ) : filtered.map((v) => (
              <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">
                  <div className="flex items-center gap-1.5"><Ship className="size-3.5 text-muted-foreground" /> {v.vesselName}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{v.voyageNumber}</td>
                <td className="px-3 py-2">{v.originPortCode} → {v.destinationPortCode}</td>
                <td className="px-3 py-2"><Calendar className="mr-1 inline size-3" />{formatDate(v.departureDate)}</td>
                <td className="px-3 py-2">{formatDate(v.cutOffDate)}</td>
                <td className="px-3 py-2">{formatDate(v.arrivalDate)}</td>
                <td className="px-3 py-2">{v.voyageType}</td>
                <td className="px-3 py-2 text-xs">{v.shippingLine}</td>
                <td className="px-3 py-2">
                  <button onClick={() => onToggleActive(v.id, v.isActive)} className="hover:opacity-70">
                    {v.isActive ? <ToggleRight className="size-5 text-green-600" /> : <ToggleLeft className="size-5 text-gray-400" />}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(v)}><Pencil className="size-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(v.id)}><Trash2 className="size-3.5 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Voyage" : "New Voyage"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Origin Port</Label>
              <select name="originPortId" defaultValue={editing?.originPortCode ?? ""} required className="h-10 w-full rounded-lg border px-3 text-sm">
                <option value="">Select...</option>
                {seaPorts.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Destination Port</Label>
              <select name="destinationPortId" defaultValue={editing?.destinationPortCode ?? ""} required className="h-10 w-full rounded-lg border px-3 text-sm">
                <option value="">Select...</option>
                {seaPorts.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Vessel Name</Label>
              <Input name="vesselName" defaultValue={editing?.vesselName ?? ""} required placeholder="MSC Diana" />
            </div>
            <div className="space-y-1.5">
              <Label>Voyage Number</Label>
              <Input name="voyageNumber" defaultValue={editing?.voyageNumber ?? ""} required placeholder="MD-2608" />
            </div>
            <div className="space-y-1.5">
              <Label>Departure Date</Label>
              <Input name="departureDate" type="date" defaultValue={editing ? new Date(editing.departureDate).toISOString().split("T")[0] : ""} required />
            </div>
            <div className="space-y-1.5">
              <Label>Cut-off Date</Label>
              <Input name="cutOffDate" type="date" defaultValue={editing ? new Date(editing.cutOffDate).toISOString().split("T")[0] : ""} required />
            </div>
            <div className="space-y-1.5">
              <Label>Arrival Date</Label>
              <Input name="arrivalDate" type="date" defaultValue={editing ? new Date(editing.arrivalDate).toISOString().split("T")[0] : ""} required />
            </div>
            <div className="space-y-1.5">
              <Label>Voyage Type</Label>
              <select name="voyageType" defaultValue={editing?.voyageType ?? "direct"} required className="h-10 w-full rounded-lg border px-3 text-sm">
                {VOYAGE_TYPES.map((vt) => (
                  <option key={vt.value} value={vt.value}>{vt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Transit Time (days)</Label>
              <Input name="transitTime" type="number" min={0} defaultValue={editing?.transitTime ?? ""} required placeholder="14" />
            </div>
            <div className="space-y-1.5">
              <Label>Shipping Line</Label>
              <Input name="shippingLine" defaultValue={editing?.shippingLine ?? ""} required placeholder="MSC" />
            </div>
            <div className="flex items-center gap-4 sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="rounded" />
                نشط / Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="showOnCalculator" defaultChecked={editing?.showOnCalculator ?? true} className="rounded" />
                عرض في الحاسبة / Show on calculator
              </label>
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
