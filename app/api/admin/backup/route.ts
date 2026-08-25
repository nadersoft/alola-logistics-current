import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/log";

const EXPORTABLE_TABLES = [
  "User", "Customer", "Port", "ContainerType", "Quote", "Shipment",
  "Invoice", "Voyage", "SystemSetting", "Notification", "AuditLog",
] as const;

type TableName = (typeof EXPORTABLE_TABLES)[number];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const table = req.nextUrl.searchParams.get("table") as TableName | null;
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  if (!table || !EXPORTABLE_TABLES.includes(table)) {
    return NextResponse.json({ error: "Invalid or missing table parameter" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (prisma as any)[table].findMany({ take: 10000 });

    await audit({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: "DATA_EXPORT",
      target: `table:${table}`,
      payload: { rowCount: data.length, format },
    });

    if (format === "csv") {
      if (data.length === 0) {
        return new NextResponse("", { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${table}.csv"` } });
      }
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((row: Record<string, unknown>) =>
          headers.map((h) => {
            const val = row[h];
            const str = val === null || val === undefined ? "" : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(",")
        ),
      ];
      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${table}_${Date.now()}.csv"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="${table}_${Date.now()}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
