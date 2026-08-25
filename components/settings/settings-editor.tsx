"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2Icon, SaveIcon } from "lucide-react";
import type { SettingsSection, SettingField } from "@/lib/settings-config";
import { saveSettingsAction } from "@/lib/settings-actions";

const SURCHARGE_FIELDS: { key: keyof import("@/lib/calculation").Surcharges; label: string; isPct: boolean }[] = [
  { key: "baf", label: "BAF", isPct: false },
  { key: "thcOrigin", label: "THC (origin)", isPct: false },
  { key: "thcDestination", label: "THC (destination)", isPct: false },
  { key: "fuelPct", label: "Fuel surcharge", isPct: true },
  { key: "insurancePct", label: "Insurance", isPct: true },
  { key: "profitMarginPct", label: "Profit margin", isPct: true },
];

type Values = Record<string, string | number | boolean | Record<string, number>>;

function normalize(initial: Values, section: SettingsSection): Values {
  const out: Values = { ...initial };
  for (const f of section.fields) {
    if (out[f.key] === undefined) {
      if (f.type === "surcharges") {
        out[f.key] = { baf: 0, thcOrigin: 0, thcDestination: 0, fuelPct: 0, insurancePct: 0, profitMarginPct: 0 };
      } else if (f.type === "number" || f.type === "range") {
        out[f.key] = "";
      } else if (f.type === "boolean") {
        out[f.key] = false;
      } else {
        out[f.key] = "";
      }
    }
  }
  return out;
}

export function SettingsEditor({ sections, values }: { sections: SettingsSection[]; values: Values }) {
  const [state, setState] = useState<Values>(() =>
    sections.reduce<Values>((acc, s) => ({ ...acc, ...normalize(values, s) }), {})
  );
  const [isPending, startTransition] = useTransition();

  function set(key: string, value: string | number | boolean | Record<string, number>) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onSave(section: SettingsSection) {
    const items = section.fields.map((f) => {
      const raw = state[f.key];
      let value: unknown = raw;
      if ((f.type === "number" || f.type === "range") && typeof raw === "string") {
        const n = Number(raw);
        value = Number.isNaN(n) ? 0 : n;
      }
      if (f.type === "surcharges" && raw && typeof raw === "object") {
        const s = raw as Record<string, number>;
        value = Object.fromEntries(
          Object.entries(s).map(([k, v]) => [k, typeof v === "string" ? Number(v) || 0 : Number(v) || 0])
        );
      }
      return { key: f.key, value, category: section.category, description: null };
    });

    startTransition(async () => {
      const res = await saveSettingsAction(items);
      if (res?.ok) {
        toast.success(`${section.title} saved`);
      } else {
        toast.error("Failed to save settings");
      }
    });
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <Card key={section.category}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <Field
                  key={field.key}
                  field={field}
                  value={state[field.key]}
                  onChange={(v) => set(field.key, v)}
                />
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button onClick={() => onSave(section)} disabled={isPending}>
              {isPending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon />}
              Save changes
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: SettingField;
  value: string | number | boolean | Record<string, number>;
  onChange: (v: string | number | boolean | Record<string, number>) => void;
}) {
  const id = `field-${field.key}`;

  if (field.type === "surcharges") {
    const sur = (value ?? {}) as Record<string, number>;
    return (
      <div className="sm:col-span-2 space-y-3">
        <div>
          <Label>{field.label}</Label>
          {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SURCHARGE_FIELDS.map((sf) => (
            <div key={sf.key} className="space-y-1.5">
              <Label htmlFor={`${id}-${sf.key}`} className="text-xs font-normal">
                {sf.label} {sf.isPct ? "(%)" : ""}
              </Label>
              <Input
                id={`${id}-${sf.key}`}
                type="number"
                value={Number(sur[sf.key] ?? 0)}
                onChange={(e) => onChange({ ...sur, [sf.key]: e.target.valueAsNumber || 0 })}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea
          id={id}
          rows={3}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "number" ? (
        <Input
          id={id}
          type="number"
          min={field.min}
          step={field.step ?? 1}
          value={typeof value === "number" || typeof value === "string" ? (value as string | number) : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "range" ? (
        <div className="flex items-center gap-3 pt-1.5">
          <input
            id={id}
            type="range"
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            value={typeof value === "number" ? value : Number(value) || 0}
            onChange={(e) => onChange(e.target.valueAsNumber)}
            className="flex-1 accent-[var(--primary)]"
          />
          <span className="w-12 rounded-md border bg-background px-2 py-1 text-center font-mono text-xs">
            {typeof value === "number" ? value : Number(value) || 0}
          </span>
        </div>
      ) : field.type === "boolean" ? (
        <div className="pt-1.5">
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      ) : field.type === "color" ? (
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg border bg-background">
            <input
              id={id}
              type="color"
              value={typeof value === "string" && value.startsWith("#") ? value : "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="size-12 cursor-pointer border-0 bg-transparent p-0"
            />
          </div>
          <Input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            className="max-w-36 font-mono text-xs"
          />
        </div>
      ) : field.type === "select" ? (
        <Select
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={id}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help ? (
        <p className="text-xs text-muted-foreground">{field.help}</p>
      ) : null}
    </div>
  );
}
