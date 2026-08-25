import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AccessScope = {
  ops: boolean;
  customerId: string | null;
  customerName: string | null;
  userEmail: string | null;
  userId: string | null;
  role: string | null;
};

export function isOpsRole(role?: string | null): boolean {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export async function getScope(): Promise<AccessScope> {
  const session = await auth();
  if (!session?.user) {
    return { ops: false, customerId: null, customerName: null, userEmail: null, userId: null, role: null };
  }
  const role = session.user.role ?? null;
  if (isOpsRole(role)) {
    return { ops: true, customerId: null, customerName: null, userEmail: session.user.email ?? null, userId: session.user.id ?? null, role };
  }
  const email = session.user.email?.toLowerCase() ?? null;
  let customerId: string | null = null;
  let customerName: string | null = null;
  if (email) {
    const customer = await prisma.customer.findFirst({ where: { email } });
    customerId = customer?.id ?? null;
    customerName = customer?.name ?? null;
  }
  return { ops: false, customerId, customerName, userEmail: email, userId: session.user.id ?? null, role };
}
