"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SaveIcon, Trash2Icon, ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clearIntegrationKey, saveIntegrationKey, testIntegrationKey } from "@/lib/actions/integrations";
import { INTEGRATION_KEYS, type IntegrationKeyId, type IntegrationKeyDef } from "@/lib/integration-keys";
import { cn } from "@/lib/utils";

export type IntegrationKeyState = {
  id: IntegrationKeyId;
  stored: boolean;
  env: boolean;
};

type TestResult = { ok: boolean; message: string } | null;

export function IntegrationsEditor({ keys }: { keys: IntegrationKeyState[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, TestResult>>({});

  function submit(keyId: IntegrationKeyId, value: string) {
    startTransition(async () => {
      const res = await saveIntegrationKey(keyId, value);
      if (res.ok) {
        setResults((prev) => ({ ...prev, [keyId]: null }));
        router.refresh();
      }
    });
  }

  function clear(keyId: IntegrationKeyId) {
    startTransition(async () => {
      const res = await clearIntegrationKey(keyId);
      if (res.ok) {
        setResults((prev) => ({ ...prev, [keyId]: null }));
        router.refresh();
      }
    });
  }

  function runTest(keyId: IntegrationKeyId) {
    setResults((prev) => ({ ...prev, [keyId]: { ok: true, message: "" } }));
    startTransition(async () => {
      const res = await testIntegrationKey(keyId);
      setResults((prev) => ({ ...prev, [keyId]: { ok: res.ok, message: res.message } }));
    });
  }

  return (
    <div className="space-y-4">
      {keys.map((key) => {
        const def = INTEGRATION_KEYS[key.id];
        return (
          <KeyForm
            key={key.id}
            def={def}
            state={key}
            pending={pending}
            testing={Boolean(results[key.id]) && results[key.id]?.message === ""}
            result={results[key.id] ?? null}
            onSubmit={submit}
            onClear={clear}
            onTest={runTest}
          />
        );
      })}
    </div>
  );
}

function KeyForm({
  def,
  state,
  pending,
  testing,
  result,
  onSubmit,
  onClear,
  onTest,
}: {
  def: IntegrationKeyDef;
  state: IntegrationKeyState;
  pending: boolean;
  testing: boolean;
  result: TestResult;
  onSubmit: (id: IntegrationKeyId, value: string) => void;
  onClear: (id: IntegrationKeyId) => void;
  onTest: (id: IntegrationKeyId) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = state.stored || state.env;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{def.label}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
          <SourceBadge label="SystemSetting" active={state.stored} />
          <SourceBadge label="process.env" active={state.env} />
          {!hasValue ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              Trial mode — console only. Set a key to activate.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            ref={inputRef}
            type={def.secret ? "password" : "text"}
            placeholder={def.placeholder}
            defaultValue={state.env && !state.stored ? "" : undefined}
            disabled={pending}
          />
          <p className="mt-1 text-[0.7rem] text-muted-foreground">
            {state.stored
              ? "Stored (encrypted at rest). Enter a new value to overwrite."
              : state.env
                ? "Currently provided by environment variable. Saving here overrides it."
                : "Not configured. Paste your key to activate (stored encrypted)."}
          </p>
          {result ? (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}
            >
              {result.message}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !hasValue}
          onClick={() => onTest(state.id)}
        >
          {testing ? <Loader2Icon className="size-4 animate-spin" /> : <ZapIcon className="size-4" />}
          Test
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => onSubmit(state.id, inputRef.current?.value ?? "")}
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Save
        </Button>
        {state.stored ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => onClear(state.id)}>
            <Trash2Icon className="size-4" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SourceBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5",
        active ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "border-border text-muted-foreground"
      )}
    >
      {label}: {active ? "active" : "—"}
    </span>
  );
}
