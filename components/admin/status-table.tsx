import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type ProviderStatusRow = {
  provider: string;
  purpose: string;
  source: "setting" | "env" | "none";
  hint: string;
};

const LABEL: Record<ProviderStatusRow["source"], string> = {
  setting: "SystemSetting (encrypted)",
  env: "process.env",
  none: "trial mode (console)",
};

export function StatusTable({ rows }: { rows: ProviderStatusRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Purpose</TableHead>
          <TableHead>Active source</TableHead>
          <TableHead>Hint</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.provider}>
            <TableCell className="font-medium">{r.provider}</TableCell>
            <TableCell>{r.purpose}</TableCell>
            <TableCell>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs",
                  r.source === "none"
                    ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : r.source === "setting"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-300"
                )}
              >
                {LABEL[r.source]}
              </span>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{r.hint}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
