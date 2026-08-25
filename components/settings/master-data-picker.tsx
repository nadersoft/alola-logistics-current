"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveSettingsAction } from "@/lib/settings-actions";

export type PickerCountry = { id: string; code: string; name: string };
export type PickerPort = { id: string; code: string; name: string; countryId: string | null };
export type PickerCurrency = { id: string; code: string; name: string; isDefault: boolean };

export function MasterDataPicker({
  countries,
  ports,
  currencies,
  currentCountryCode,
  currentPortCode,
  currentCurrency,
}: {
  countries: PickerCountry[];
  ports: PickerPort[];
  currencies: PickerCurrency[];
  currentCountryCode: string;
  currentPortCode: string;
  currentCurrency: string;
}) {
  const [countryCode, setCountryCode] = useState<string>(currentCountryCode || countries[0]?.code || "");
  const [portCode, setPortCode] = useState<string>(currentPortCode);
  const [currency, setCurrency] = useState<string>(currentCurrency);
  const [pending, startTransition] = useTransition();

  const countryPorts = useMemo(() => {
    const c = countries.find((x) => x.code === countryCode);
    if (!c) return [];
    return ports.filter((p) => p.countryId === c.id);
  }, [countries, ports, countryCode]);

  function onCountryChange(code: string) {
    setCountryCode(code);
    const c = countries.find((x) => x.code === code);
    const stillValid = c ? countryPorts.some((p) => p.code === portCode) : false;
    if (!stillValid) setPortCode("");
  }

  function onSave() {
    const items: { key: string; value: unknown; category: "DEFAULTS"; description: null }[] = [];
    if (countryCode) items.push({ key: "defaults.originCountryCode", value: countryCode, category: "DEFAULTS", description: null });
    if (portCode) items.push({ key: "defaults.originPortCode", value: portCode, category: "DEFAULTS", description: null });
    if (currency) items.push({ key: "defaults.currency", value: currency, category: "DEFAULTS", description: null });

    startTransition(async () => {
      const res = await saveSettingsAction(items);
      if (res?.ok) toast.success("Origin & currency saved");
      else toast.error("Failed to save");
    });
  }

  const selectedCountry = countries.find((c) => c.code === countryCode);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Origin & display currency</CardTitle>
        <CardDescription>Cascading select — pick a country, then a port in that country. Currency options come from the currency table.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Origin country</Label>
            <Select value={countryCode} onValueChange={onCountryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Origin port ({selectedCountry?.name ?? "country"})</Label>
            <Select value={portCode} onValueChange={setPortCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select port in this country" />
              </SelectTrigger>
              <SelectContent>
                {countryPorts.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No ports in this country
                  </SelectItem>
                ) : (
                  countryPorts.map((p) => (
                    <SelectItem key={p.id} value={p.code}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Display currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.code} — {c.name}
                    {c.isDefault ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t">
        <Button onClick={onSave} disabled={pending}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon />}
          Save origin & currency
        </Button>
      </CardFooter>
    </Card>
  );
}
