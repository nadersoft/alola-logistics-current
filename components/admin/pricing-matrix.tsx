"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BoxIcon,
  PackageIcon,
  PlaneIcon,
  ShipIcon,
  SnowflakeIcon,
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  PowerIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  BellRingIcon,
  Loader2Icon,
  RefreshCcwIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createRule, updateRule, toggleRule, deleteRule, runGuardNow } from "@/lib/actions/pricing";
import { createField, updateField, deleteField } from "@/lib/actions/fields";

export type FieldRow = {
  id: string;
  key: string;
  label: string;
  type: string;
  appliesTo: string;
  icon: string | null;
  unit: string | null;
  defaultValue: number | null;
  isEnabled: boolean;
  sortOrder: number;
};

export type PortOption = { id: string; code: string; name: string; countryName: string | null };
export type ContainerOption = { id: string; code: string; name: string };

export type RuleFieldRow = {
  id: string;
  fieldId: string;
  value: number | null;
  isEnabled: boolean;
  key: string;
  label: string;
  unit: string | null;
  icon: string | null;
};

export type RuleRow = {
  id: string;
  name: string;
  originPortId: string | null;
  destinationPortId: string | null;
  mode: string | null;
  containerTypeId: string | null;
  minWeightKg: number | null;
  maxWeightKg: number | null;
  priority: number;
  baseRate: number;
  weightRate: number | null;
  fobExwType: string | null;
  fobExwRate: number | null;
  isActive: boolean;
  originPortName: string | null;
  destinationPortName: string | null;
  containerName: string | null;
  fields: RuleFieldRow[];
};

export type AlertRow = {
  id: string;
  ruleId: string | null;
  level: string;
  title: string;
  message: string;
  impact: unknown;
  createdAt: string;
};

export type HealthBadge = { health: "critical" | "warning" | "healthy"; openAlerts: number };

export type GuardIssue = {
  level: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  title: string;
  message: string;
  impact?: string;
};

export type GuardReport = {
  health: "critical" | "warning" | "healthy";
  summary: { rules: number; critical: number; high: number; medium: number; info: number };
  rules: { ruleId: string; ruleName: string; health: "critical" | "warning" | "healthy"; profitPct: number; expectedTotal: number; issues: GuardIssue[] }[];
  alertsPersisted: number;
};

const MODE_ICONS: Record<string, typeof BoxIcon> = { FCL: BoxIcon, LCL: PackageIcon, AIR: PlaneIcon, BULK: ShipIcon };
const HEALTH_META: Record<string, { dot: string; label: string }> = {
  critical: { dot: "bg-red-500", label: "Critical" },
  warning: { dot: "bg-amber-500", label: "Warning" },
  healthy: { dot: "bg-emerald-500", label: "Healthy" },
};

function fmt(n: number | null | undefined): string {
  return n == null ? "\u2014" : String(n);
}

export function PricingMatrix({
  initialRules,
  fields,
  ports,
  containerTypes,
  healthBadge,
  guardReport: initialGuard,
  alerts: initialAlerts,
}: {
  initialRules: RuleRow[];
  fields: FieldRow[];
  ports: PortOption[];
  containerTypes: ContainerOption[];
  healthBadge: HealthBadge;
  guardReport: GuardReport;
  alerts: AlertRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState("rules");
  const [guard, setGuard] = useState<GuardReport | null>(initialGuard);
  const [pending, startTransition] = useTransition();

  const [editingRule, setEditingRule] = useState<RuleRow | "new" | null>(null);
  const [editingField, setEditingField] = useState<FieldRow | "new" | null>(null);

  function refresh() {
    router.refresh();
  }

  function onGuard() {
    startTransition(async () => {
      const res = await runGuardNow();
      if (res.ok && res.result) {
        setGuard(res.result);
        toast.success(`Smart guard: ${res.result.health.toUpperCase()} — ${res.result.summary.critical} critical issues`);
        refresh();
      } else {
        toast.error(res.error ?? "Guard failed");
      }
    });
  }

  const healthMeta = HEALTH_META[healthBadge.health];

  return (
    <div className="space-y-6">
      {/* Health banner */}
      <Card className={healthBadge.health === "critical" ? "border-red-500/40" : healthBadge.health === "warning" ? "border-amber-500/40" : "border-emerald-500/40"}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <span className={`size-3 rounded-full ${healthMeta.dot} animate-pulse`} />
            <div>
              <p className="font-semibold">System health: {healthMeta.label}</p>
              <p className="text-xs text-muted-foreground">
                {guard
                  ? `${guard.summary.critical} critical آ· ${guard.summary.high} high آ· ${guard.summary.medium} medium آ· ${guard.summary.rules} rules evaluated`
                  : `${healthBadge.openAlerts} open alerts`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{healthBadge.openAlerts} open alerts</Badge>
            <Button variant="outline" size="sm" className="gap-1" onClick={onGuard} disabled={pending}>
              {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <RefreshCcwIcon className="size-3.5" />}
              Run smart guard
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules">Pricing rules</TabsTrigger>
          <TabsTrigger value="fields">Field definitions</TabsTrigger>
          <TabsTrigger value="alerts">
            System alerts
            {initialAlerts.length > 0 ? <Badge className="ml-2">{initialAlerts.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setEditingRule("new")}>
              <PlusIcon className="size-4" /> New rule
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Lane</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Weight range</TableHead>
                      <TableHead className="text-right">Base rate</TableHead>
                      <TableHead className="text-right">Priority</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                          No pricing rules yet. Create one to start the smart pricing engine.
                        </TableCell>
                      </TableRow>
                    ) : (
                      initialRules.map((rule) => {
                        const ModeIcon = rule.mode ? MODE_ICONS[rule.mode] : null;
                        const hasReefer = rule.fields.some((f) => f.key === "reefer" && f.value != null && f.value > 0);
                        const report = guard?.rules.find((g) => g.ruleId === rule.id);
                        return (
                          <TableRow key={rule.id}>
                            <TableCell className="font-medium">{rule.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {rule.originPortName ?? "Any"} → {rule.destinationPortName ?? "Any"}
                              {rule.containerName ? <span className="ml-1 text-xs">({rule.containerName})</span> : null}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {ModeIcon ? <ModeIcon className="size-4" /> : <span>—</span>}
                                {rule.mode ?? "Any"}
                                {hasReefer ? <SnowflakeIcon className="ml-1 size-3.5 text-sky-500" /> : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {rule.minWeightKg == null && rule.maxWeightKg == null ? "Any" : `${fmt(rule.minWeightKg)} – ${fmt(rule.maxWeightKg)} kg`}
                            </TableCell>
                            <TableCell className="text-right">${rule.baseRate}</TableCell>
                            <TableCell className="text-right">{rule.priority}</TableCell>
                            <TableCell className="text-muted-foreground">
                              <div className="flex max-w-52 flex-wrap gap-1">
                                {rule.fields.length === 0 ? (
                                  <span className="text-xs">—</span>
                                ) : (
                                  rule.fields.map((f) => (
                                    <Badge key={f.id} variant="outline" className="text-[10px]">
                                      {f.label} {f.value != null ? `(${f.unit === "%" ? f.value + "%" : "$" + f.value})` : ""}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {report ? (
                                <Badge variant={report.health === "critical" ? "destructive" : report.health === "warning" ? "outline" : "default"}>{report.health}</Badge>
                              ) : (
                                <Badge variant="outline">—</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={rule.isActive ? "default" : "outline"}>{rule.isActive ? "Active" : "Paused"}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingRule(rule)}>
                                  <PencilIcon className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() =>
                                    startTransition(async () => {
                                      await toggleRule(rule.id);
                                      toast.success(rule.isActive ? "Rule paused" : "Rule activated");
                                      refresh();
                                    })
                                  }
                                >
                                  <PowerIcon className="size-3.5" />
                                </Button>
                                <DeleteRuleButton id={rule.id} name={rule.name} onDone={refresh} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Guard detail */}
          {guard && guard.rules.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {guard.health === "critical" ? <ShieldXIcon className="size-4 text-red-500" /> : guard.health === "warning" ? <ShieldAlertIcon className="size-4 text-amber-500" /> : <ShieldCheckIcon className="size-4 text-emerald-500" />}
                  Smart guard report
                </CardTitle>
                <CardDescription>Profit %, expected total and issues per rule. Critical issues block the rule from going live.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {guard.rules.map((r) => (
                  <div key={r.ruleId} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{r.ruleName}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span>Total: ${r.expectedTotal}</span>
                        <Badge variant="outline">{r.profitPct}% margin</Badge>
                        <Badge variant={r.health === "critical" ? "destructive" : r.health === "warning" ? "outline" : "default"}>{r.health}</Badge>
                      </div>
                    </div>
                    {r.issues.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {r.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-muted-foreground">
                            <Badge variant={issue.level === "CRITICAL" ? "destructive" : issue.level === "HIGH" ? "outline" : "secondary"} className="mr-1">
                              {issue.level}
                            </Badge>
                            {issue.title} — {issue.message}
                            {issue.impact ? <span className="text-red-500"> آ· {issue.impact}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-emerald-600">No issues detected.</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-1" onClick={() => setEditingField("new")}>
              <PlusIcon className="size-4" /> New field
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Default</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">{f.key}</TableCell>
                      <TableCell className="font-medium">{f.label}</TableCell>
                      <TableCell className="text-muted-foreground">{f.appliesTo}</TableCell>
                      <TableCell className="text-muted-foreground">{f.unit ?? "—"}</TableCell>
                      <TableCell className="text-right">{f.defaultValue ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={f.isEnabled ? "default" : "outline"}>{f.isEnabled ? "Enabled" : "Disabled"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingField(f)}>
                            <PencilIcon className="size-3.5" />
                          </Button>
                          <DeleteFieldButton id={f.id} label={f.label} onDone={refresh} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="p-0">
              {initialAlerts.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No open alerts. Run the smart guard to evaluate the matrix.</p>
              ) : (
                <ul className="divide-y">
                  {initialAlerts.map((a) => (
                    <li key={a.id} className="flex items-start gap-3 p-4">
                      <BellRingIcon className={`mt-0.5 size-4 ${a.level === "CRITICAL" ? "text-red-500" : "text-amber-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          <Badge variant={a.level === "CRITICAL" ? "destructive" : "outline"} className="mr-1">
                            {a.level}
                          </Badge>
                          {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{a.message}</p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingRule !== null ? (
        <RuleDialog
          rule={editingRule === "new" ? null : editingRule}
          fields={fields}
          ports={ports}
          containerTypes={containerTypes}
          onClose={() => setEditingRule(null)}
          onSaved={() => {
            setEditingRule(null);
            toast.success(editingRule === "new" ? "Rule created" : "Rule updated");
            refresh();
          }}
        />
      ) : null}
      {editingField !== null ? (
        <FieldDialog
          field={editingField === "new" ? null : editingField}
          onClose={() => setEditingField(null)}
          onSaved={() => {
            setEditingField(null);
            toast.success(editingField === "new" ? "Field created" : "Field updated");
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function DeleteRuleButton({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
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
          <AlertDialogTitle>Delete rule “{name}”</AlertDialogTitle>
          <AlertDialogDescription>This removes the rule and its field assignments. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await deleteRule(id);
                if (res.ok) {
                  toast.success("Rule deleted");
                  onDone();
                } else {
                  toast.error(res.error ?? "Delete failed");
                }
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

function DeleteFieldButton({ id, label, onDone }: { id: string; label: string; onDone: () => void }) {
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
          <AlertDialogTitle>Delete field “{label}”</AlertDialogTitle>
          <AlertDialogDescription>Fields used by pricing rules cannot be deleted. Disable it instead.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await deleteField(id);
                if (res.ok) {
                  toast.success("Field deleted");
                  onDone();
                } else {
                  toast.error(res.error ?? "Delete failed");
                }
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

// ---------- Rule dialog ----------

function RuleDialog({
  rule,
  fields,
  ports,
  containerTypes,
  onClose,
  onSaved,
}: {
  rule: RuleRow | null;
  fields: FieldRow[];
  ports: PortOption[];
  containerTypes: ContainerOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);
  const ruleFieldIds = new Set((rule?.fields ?? []).map((f) => f.fieldId));
  const valueOf = (fieldId: string) => rule?.fields.find((f) => f.fieldId === fieldId)?.value;
  const [enabledFieldIds, setEnabledFieldIds] = useState<string[]>(() => fields.filter((f) => ruleFieldIds.has(f.id)).map((f) => f.id));
  const [fieldValueMap, setFieldValueMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      const v = valueOf(f.id) ?? f.defaultValue ?? 0;
      init[f.id] = String(v);
    }
    return init;
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const fieldIds = enabledFieldIds;
    const fieldValues: Record<string, string> = {};
    for (const f of fields) {
      if (fieldIds.includes(f.id)) {
        const raw = fieldValueMap[f.id];
        fieldValues[f.id] = raw != null && raw.trim() !== "" ? raw : String(f.defaultValue ?? 0);
      }
    }
    data.set("fieldValues", JSON.stringify(fieldValues));
    for (const id of enabledFieldIds) {
      data.append("fieldIds", id);
    }
    if (rule) data.set("id", rule.id);

    startTransition(async () => {
      const res = rule ? await updateRule(data) : await createRule(data);
      if (res.ok) onSaved();
      else toast.error(res.error ?? "Save failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Edit rule" : "New pricing rule"}</DialogTitle>
          <DialogDescription>Total = base rate (per container) + enabled fields + FOB/EXW + weight × rate.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Rule name</Label>
            <Input id="name" name="name" required defaultValue={rule?.name ?? ""} placeholder="FCL — Jeddah → Dammam (40GP)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Origin port</Label>
              <Select name="originPortId" defaultValue={rule?.originPortId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Any origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {ports.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Destination port</Label>
              <Select name="destinationPortId" defaultValue={rule?.destinationPortId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Any destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {ports.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select name="mode" defaultValue={rule?.mode ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Any mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="FCL">FCL</SelectItem>
                  <SelectItem value="LCL">LCL</SelectItem>
                  <SelectItem value="AIR">AIR</SelectItem>
                  <SelectItem value="BULK">BULK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Container type</Label>
              <Select name="containerTypeId" defaultValue={rule?.containerTypeId ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Any container" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  {containerTypes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} ({c.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Input type="number" name="priority" min={1} max={1000} defaultValue={rule?.priority ?? 100} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min weight (kg)</Label>
              <Input type="number" name="minWeightKg" min={0} step="any" defaultValue={rule?.minWeightKg ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Max weight (kg)</Label>
              <Input type="number" name="maxWeightKg" min={0} step="any" defaultValue={rule?.maxWeightKg ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Base rate (USD)</Label>
              <Input type="number" name="baseRate" min={0} step="0.01" required defaultValue={rule?.baseRate ?? ""} placeholder="e.g. 1800" />
            </div>
            <div className="space-y-1.5">
              <Label>Weight rate (USD/kg)</Label>
              <Input type="number" name="weightRate" min={0} step="any" defaultValue={rule?.weightRate ?? ""} placeholder="e.g. 2.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>FOB / EXW</Label>
              <Select name="fobExwType" defaultValue={rule?.fobExwType ?? "NONE"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not applicable</SelectItem>
                  <SelectItem value="FOB">FOB</SelectItem>
                  <SelectItem value="EXW">EXW</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>FOB / EXW rate</Label>
              <Input type="number" name="fobExwRate" min={0} step="0.01" defaultValue={rule?.fobExwRate ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enabled fields</Label>
            <div className="grid grid-cols-1 gap-2 rounded-lg border p-3 bg-gray-50">
              {fields.map((f) => {
                const isEnabled = enabledFieldIds.includes(f.id);
                const val = fieldValueMap[f.id] ?? String(f.defaultValue ?? 0);
                return (
                  <div
                    key={f.id}
                    className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${isEnabled ? "bg-white border-blue-400 shadow-sm" : "bg-gray-100 border-gray-200"}`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          if (e.target.checked) setEnabledFieldIds([...enabledFieldIds, f.id]);
                          else setEnabledFieldIds(enabledFieldIds.filter((k) => k !== f.id));
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{f.label}</span>
                    </label>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => setFieldValueMap({ ...fieldValueMap, [f.id]: e.target.value })}
                      placeholder={f.unit === "%" ? "0%" : "0"}
                      disabled={!isEnabled}
                      className={`w-24 rounded border px-2 py-1.5 text-sm ${!isEnabled ? "bg-gray-200 opacity-50 cursor-not-allowed" : "bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"}`}
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">{f.unit ?? ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

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
              {rule ? "Save changes" : "Create rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Field dialog ----------

function FieldDialog({ field, onClose, onSaved }: { field: FieldRow | null; onClose: () => void; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(field?.isEnabled ?? true);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (field) data.set("id", field.id);
    if (field) data.set("key", field.key);
    startTransition(async () => {
      const res = field ? await updateField(data) : await createField(data);
      if (res.ok) onSaved();
      else toast.error(res.error ?? "Save failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? "Edit field" : "New field definition"}</DialogTitle>
          <DialogDescription>Fields become pricing inputs inside every rule.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {!field ? (
            <div className="space-y-1.5">
              <Label htmlFor="key">Key</Label>
              <Input id="key" name="key" required pattern="[a-z0-9_]+" placeholder="dg, reefer, insurance…" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="label">Label</Label>
            <Input id="label" name="label" required defaultValue={field?.label ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Applies to</Label>
              <Select name="appliesTo" defaultValue={field?.appliesTo ?? "ALL"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All modes</SelectItem>
                  <SelectItem value="FCL">FCL</SelectItem>
                  <SelectItem value="LCL">LCL</SelectItem>
                  <SelectItem value="AIR">AIR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select name="unit" defaultValue={field?.unit ?? "SAR"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="/kg">/kg</SelectItem>
                  <SelectItem value="">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default value</Label>
              <Input type="number" name="defaultValue" step="any" defaultValue={field?.defaultValue ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input type="number" name="sortOrder" defaultValue={field?.sortOrder ?? 0} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="isEnabled">Enabled</Label>
            <Switch id="isEnabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
            <input type="hidden" name="isEnabled" value={isEnabled ? "true" : "false"} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {field ? "Save changes" : "Create field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
