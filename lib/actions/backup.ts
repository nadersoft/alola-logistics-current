"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { audit, logger } from "@/lib/log";

export type BackupOptions = {
  tables: string[];
  format: "json" | "excel" | "pdf";
};

export type BackupResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
  filename?: string;
};

const EXPORTABLE_TABLES = [
  "User",
  "Customer",
  "Port",
  "ContainerType",
  "Quote",
  "Shipment",
  "Invoice",
  "Voyage",
  "SystemSetting",
  "Notification",
  "AuditLog",
] as const;

export type TableName = (typeof EXPORTABLE_TABLES)[number];

export async function getExportableTables(): Promise<TableName[]> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return [...EXPORTABLE_TABLES];
}

export async function exportTableData(tableName: TableName): Promise<BackupResult> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    return { ok: false, error: "Unauthorized" };
  }

  if (!EXPORTABLE_TABLES.includes(tableName)) {
    return { ok: false, error: `Invalid table: ${tableName}` };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (prisma as any)[tableName].findMany({
      take: 10000,
      orderBy: { createdAt: "desc" } as never,
    });

    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "DATA_EXPORT",
      target: `table:${tableName}`,
      payload: { rowCount: data.length, table: tableName },
    });

    return { ok: true, data, filename: `${tableName.toLowerCase()}_export_${Date.now()}` };
  } catch (err) {
    logger.error({ err, tableName }, "export:failed");
    return { ok: false, error: `Failed to export ${tableName}: ${(err as Error).message}` };
  }
}

export async function exportMultipleTables(tables: TableName[]): Promise<BackupResult> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const results: Record<string, unknown[]> = {};
    for (const table of tables) {
      if (!EXPORTABLE_TABLES.includes(table)) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      results[table] = await (prisma as any)[table].findMany({
        take: 10000,
        orderBy: { createdAt: "desc" } as never,
      });
    }

    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "DATA_EXPORT",
      target: "multi-table",
      payload: { tables, totalRows: Object.values(results).reduce((s, r) => s + r.length, 0) },
    });

    return { ok: true, data: results, filename: `full_backup_${Date.now()}` };
  } catch (err) {
    logger.error({ err }, "export:multi-failed");
    return { ok: false, error: `Export failed: ${(err as Error).message}` };
  }
}

export async function getDbStats(): Promise<Record<string, number>> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const stats: Record<string, number> = {};
  for (const table of EXPORTABLE_TABLES) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stats[table] = await (prisma as any)[table].count();
    } catch {
      stats[table] = 0;
    }
  }
  return stats;
}

export async function getRecentExports(): Promise<{ id: string; table: string; rows: number; createdAt: Date }[]> {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }

  const logs = await prisma.auditLog.findMany({
    where: { action: "DATA_EXPORT" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return logs.map((l) => ({
    id: l.id,
    table: l.target,
    rows: ((l.payload as Record<string, unknown>)?.rowCount as number) ?? 0,
    createdAt: l.createdAt,
  }));
}
