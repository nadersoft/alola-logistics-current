import type { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      isActive?: boolean;
      ip?: string;
      loginTime?: number | null;
      lastActivity?: number | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    isActive?: boolean;
    ip?: string;
    loginTime?: number;
    lastActivity?: number;
  }
}
