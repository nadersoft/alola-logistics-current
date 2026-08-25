import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/account/account-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My account</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and password.</p>
      </div>

      <AccountForm
        initialName={user.name ?? ""}
        initialEmail={user.email ?? ""}
        phone={user.phone ?? null}
        countryCode={user.countryCode ?? null}
        phoneVerified={user.phoneVerified}
        isDev={process.env.NODE_ENV === "development"}
      />
    </div>
  );
}
