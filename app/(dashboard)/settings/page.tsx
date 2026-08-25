export const dynamic = "force-dynamic";
import { getAllSettings, getSettingOr } from "@/lib/settings";
import { toSettingMap } from "@/lib/theme";
import { buildSettingsSections } from "@/lib/settings-config";
import { SettingsEditor } from "@/components/settings/settings-editor";
import { MasterDataPicker } from "@/components/settings/master-data-picker";
import { DEFAULT_SURCHARGES } from "@/lib/calculation";
import { getActiveCountries, getActivePorts, getActiveCurrencies } from "@/lib/data/get-active-data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, ports, countries, currencies] = await Promise.all([
    getAllSettings(),
    getActivePorts(),
    getActiveCountries(),
    getActiveCurrencies(),
  ]);

  const sections = buildSettingsSections();

  const map = toSettingMap(settings);
  const surcharges = await getSettingOr("pricing.surcharges", DEFAULT_SURCHARGES);

  const values: Record<string, string | number | boolean | Record<string, number>> = {};
  for (const section of sections) {
    for (const field of section.fields) {
      if (field.type === "surcharges") {
        values[field.key] = { ...DEFAULT_SURCHARGES, ...(surcharges as object) };
      } else {
        values[field.key] = (map[field.key] as string | number | boolean) ?? "";
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Everything here lives in the database — zero hardcoded config. Changes apply instantly.
        </p>
      </div>
      <MasterDataPicker
        countries={countries.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
        ports={ports.map((p) => ({ id: p.id, code: p.code, name: p.name, countryId: p.countryId }))}
        currencies={currencies.map((c) => ({ id: c.id, code: c.code, name: c.name, isDefault: c.isDefault }))}
        currentCountryCode={String(map["defaults.originCountryCode"] ?? "SA")}
        currentPortCode={String(map["defaults.originPortCode"] ?? "JED")}
        currentCurrency={String(map["defaults.currency"] ?? "SAR")}
      />
      <SettingsEditor sections={sections} values={values} />
    </div>
  );
}
