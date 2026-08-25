import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCustomerTracking } from "@/lib/actions/customer-tracking";
import { CustomerTrackingTable } from "@/components/admin/customer-tracking-table";

export const dynamic = "force-dynamic";

export default async function CustomerTrackingPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const result = await getCustomerTracking();
  const rows = result.ok && result.rows ? result.rows : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customer Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registered client accounts with their profile data and last update timestamps.
        </p>
      </div>
      <CustomerTrackingTable rows={rows} error={result.ok ? undefined : result.error} />
    </div>
  );
}
