import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MasterData } from "@/components/admin/master-data";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const [countries, ports, currencies] = await Promise.all([
    prisma.country.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { ports: true } } },
    }),
    prisma.port.findMany({ orderBy: { name: "asc" }, include: { country: true } }),
    prisma.currency.findMany({ orderBy: [{ isDefault: "desc" }, { code: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Master Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Countries, ports and currencies feed the cascading origin selectors, the quote calculator and display currency.
        </p>
      </div>
      <MasterData
        countries={countries.map((c) => ({ id: c.id, code: c.code, name: c.name, dialCode: c.dialCode, isActive: c.isActive, portCount: c._count.ports }))}
        ports={ports.map((p) => ({ id: p.id, code: p.code, name: p.name, type: p.type, countryId: p.countryId, countryName: p.country?.name ?? null, isActive: p.isActive }))}
        currencies={currencies.map((c) => ({ id: c.id, code: c.code, name: c.name, symbol: c.symbol, rate: Number(c.rate) || 0, isDefault: c.isDefault, isActive: c.isActive }))}
      />
    </div>
  );
}
