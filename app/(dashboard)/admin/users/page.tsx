import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersManager } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MANAGER")) redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          RBAC matrix: SUPER_ADMIN & MANAGER manage ops, SUPPORT handles customers, CLIENT sees only their own data. Disabled accounts are signed out.
        </p>
      </div>
      <UsersManager
        currentUserId={session.user.id}
        users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, isActive: u.isActive, createdAt: u.createdAt.toISOString() }))}
      />
    </div>
  );
}
