"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, StarIcon, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createCountry, updateCountry, deleteCountry, createPort, updatePort, deletePort } from "@/lib/actions/countries";
import { createCurrency, updateCurrency, deleteCurrency, setDefaultCurrency } from "@/lib/actions/currencies";

export type CountryRow = { id: string; code: string; name: string; dialCode: string | null; isActive: boolean; portCount: number };
export type PortRow = { id: string; code: string; name: string; type: string; countryId: string | null; countryName: string | null; isActive: boolean };
export type CurrencyRow = { id: string; code: string; name: string; symbol: string | null; rate: number; isDefault: boolean; isActive: boolean };

export function MasterData({
  countries,
  ports,
  currencies,
}: {
  countries: CountryRow[];
  ports: PortRow[];
  currencies: CurrencyRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("countries");
  const [editing, setEditing] = useState<{ kind: "country" | "port" | "currency"; row: unknown; isNew: boolean } | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="countries">Countries ({countries.length})</TabsTrigger>
          <TabsTrigger value="ports">Ports ({ports.length})</TabsTrigger>
          <TabsTrigger value="currencies">Currencies ({currencies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setEditing({ kind: "country", row: null, isNew: true })}>
              <PlusIcon className="size-4" /> New country
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Dial code</TableHead>
                    <TableHead className="text-right">Ports</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.dialCode ?? "—"}</TableCell>
                      <TableCell className="text-right">{c.portCount}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "default" : "outline"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing({ kind: "country", row: c, isNew: false })}>
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <DeleteRow
                            message={`Delete country ${c.name}?`}
                            hint="Only countries without ports can be deleted."
                            onDelete={() => deleteCountry(c.id)}
                            onDone={refresh}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ports" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setEditing({ kind: "port", row: null, isNew: true })}>
              <PlusIcon className="size-4" /> New port
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ports.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.countryName ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "default" : "outline"}>{p.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing({ kind: "port", row: p, isNew: false })}>
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <DeleteRow
                            message={`Delete port ${p.name}?`}
                            hint="Only unused ports can be deleted."
                            onDelete={() => deletePort(p.id)}
                            onDone={refresh}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setEditing({ kind: "currency", row: null, isNew: true })}>
              <PlusIcon className="size-4" /> New currency
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Rate → SAR</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((cur) => (
                    <TableRow key={cur.id}>
                      <TableCell className="font-mono text-xs">{cur.code}</TableCell>
                      <TableCell className="font-medium">{cur.name}</TableCell>
                      <TableCell className="text-muted-foreground">{cur.symbol ?? "—"}</TableCell>
                      <TableCell className="text-right">{cur.rate}</TableCell>
                      <TableCell>
                        {cur.isDefault ? <StarIcon className="size-4 fill-amber-400 text-amber-400" /> : <Badge variant="outline">—</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cur.isActive ? "default" : "outline"}>{cur.isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!cur.isDefault ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                start(async () => {
                                  const res = await setDefaultCurrency(cur.id);
                                  if (res.ok) {
                                    toast.success(`${cur.code} is now the default display currency`);
                                    refresh();
                                  } else toast.error(res.error ?? "Failed");
                                })
                              }
                            >
                              Set default
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditing({ kind: "currency", row: cur, isNew: false })}>
                            <PencilIcon className="size-3.5" />
                          </Button>
                          {!cur.isDefault && cur.code !== "SAR" ? (
                            <DeleteRow message={`Delete currency ${cur.code}?`} hint="The default currency and SAR cannot be deleted." onDelete={() => deleteCurrency(cur.id)} onDone={refresh} />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editing ? (
        <EntityDialog
          kind={editing.kind}
          row={editing.row}
          isNew={editing.isNew}
          countries={countries}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            toast.success(editing.isNew ? "Created" : "Updated");
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function start(fn: () => Promise<any>) {
  return fn().catch(() => {});
}

function DeleteRow({ message, hint, onDelete, onDone }: { message: string; hint: string; onDelete: () => Promise<{ ok: boolean; error?: string }>; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 text-destructive">
          <Trash2Icon className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{message}</AlertDialogTitle>
          <AlertDialogDescription>{hint}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await onDelete();
                if (res.ok) {
                  toast.success("Deleted");
                  onDone();
                } else toast.error(res.error ?? "Delete failed");
              });
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EntityDialog({
  kind,
  row,
  isNew,
  countries,
  onClose,
  onSaved,
}: {
  kind: "country" | "port" | "currency";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  isNew: boolean;
  countries: CountryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(row?.isActive ?? true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (!isNew) data.set("id", row.id);
    if (!isNew && kind === "country") data.set("code", row.code);
    if (!isNew && kind === "port") data.set("code", row.code);

    startTransition(async () => {
      let res: { ok: boolean; error?: string };
      if (kind === "country") res = isNew ? await createCountry(data) : await updateCountry(data);
      else if (kind === "port") res = isNew ? await createPort(data) : await updatePort(data);
      else res = isNew ? await createCurrency(data) : await updateCurrency(data);
      if (res.ok) onSaved();
      else toast.error(res.error ?? "Save failed");
    });
  }

  const titles: Record<string, string> = { country: "Country", port: "Port", currency: "Currency" };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isNew ? "New" : "Edit"} {titles[kind]}
          </DialogTitle>
          <DialogDescription>Changes are applied immediately and audited.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {kind === "country" ? (
            <>
              {isNew ? (
                <div className="space-y-1.5">
                  <Label htmlFor="code">ISO code</Label>
                  <Input id="code" name="code" required maxLength={2} pattern="[A-Za-z]{2}" placeholder="SA" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={row?.name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dialCode">Dial code</Label>
                <Input id="dialCode" name="dialCode" defaultValue={row?.dialCode ?? ""} placeholder="+966" />
              </div>
            </>
          ) : null}

          {kind === "port" ? (
            <>
              {isNew ? (
                <div className="space-y-1.5">
                  <Label htmlFor="code">Port code</Label>
                  <Input id="code" name="code" required maxLength={6} pattern="[A-Za-z0-9]{2,6}" placeholder="JED" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={row?.name ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select name="countryId" defaultValue={row?.countryId ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select name="type" defaultValue={row?.type ?? "SEA"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SEA">Sea</SelectItem>
                      <SelectItem value="AIR">Air</SelectItem>
                      <SelectItem value="LAND">Land</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : null}

          {kind === "currency" ? (
            <>
              {isNew ? (
                <div className="space-y-1.5">
                  <Label htmlFor="code">ISO code</Label>
                  <Input id="code" name="code" required maxLength={3} pattern="[A-Za-z]{3}" placeholder="SAR" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={row?.name ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input id="symbol" name="symbol" defaultValue={row?.symbol ?? ""} placeholder="﷼" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rate">Rate → SAR</Label>
                  <Input id="rate" name="rate" type="number" min={0.000001} step="any" required defaultValue={row?.rate ?? 1} />
                </div>
              </div>
            </>
          ) : null}

          <div className="flex items-center gap-2">
            <Label htmlFor="isActive">Active</Label>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {isNew ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
