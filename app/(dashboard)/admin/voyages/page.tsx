import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVoyages } from "@/lib/actions/voyages";
import { VoyageManager, type PortOption } from "@/components/admin/voyage-manager";

export const dynamic = "force-dynamic";

export default async function AdminVoyagesPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER"))
    redirect("/dashboard");

  const [voyages, ports] = await Promise.all([
    getVoyages(),
    prisma.port.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, type: true },
    }),
  ]);

  const portOptions: PortOption[] = ports.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voyage Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage sailing schedules, vessels, and cut-off dates.
        </p>
      </div>
      <VoyageManager voyages={voyages} ports={portOptions} />
    </div>
  );
}
