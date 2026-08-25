"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function isOps(role?: string | null) {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

export type UserResult = { ok: boolean; error?: string };

const createSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(80),
  email: z.string().trim().email("Enter a valid email").toLowerCase(),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "SUPPORT", "CLIENT"]),
  isActive: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "SUPPORT", "CLIENT"]),
  isActive: z.boolean(),
});

export async function createUser(formData: FormData): Promise<UserResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    role: formData.get("role") ?? "CLIENT",
    isActive: formData.get("isActive") === "true" || formData.get("isActive") === null,
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid user." };

  const data = parsed.data;
  const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
  if (emailTaken) return { ok: false, error: "This email is already registered." };

  const passwordHash = await bcrypt.hash(data.password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          role: data.role,
          isActive: data.isActive ?? true,
          passwordHash,
        },
      });
      if (data.role === Role.CLIENT) {
        const existingCustomer = await tx.customer.findFirst({ where: { email: data.email } });
        if (!existingCustomer) {
          await tx.customer.create({ data: { name: data.name, email: data.email, phone: data.phone || null } });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          actorRole: session.user.role,
          action: "USER_CREATED",
          target: `user:${user.id}`,
          payload: { email: data.email, role: data.role },
        },
      });
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to create user." };
  }
}

export async function updateUser(formData: FormData): Promise<UserResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    role: formData.get("role") ?? "CLIENT",
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid user." };

  const { id, name, role, isActive } = parsed.data;
  if (id === session.user.id && (role !== session.user.role || !isActive)) {
    return { ok: false, error: "You cannot demote or disable your own account." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { name, role, isActive } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "USER_UPDATED",
        target: `user:${id}`,
        payload: { role, isActive },
      },
    }),
  ]);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetPassword(formData: FormData): Promise<UserResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash } }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "USER_PASSWORD_RESET",
        target: `user:${id}`,
      },
    }),
  ]);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<UserResult> {
  const session = await auth();
  if (!session?.user || !isOps(session.user.role)) return { ok: false, error: "FORBIDDEN" };

  if (id === session.user.id) return { ok: false, error: "You cannot delete your own account." };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { ok: false, error: "User not found." };
  if (user.role === Role.SUPER_ADMIN) {
    const admins = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
    if (admins <= 1) return { ok: false, error: "At least one SUPER_ADMIN must remain." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: session.user.id,
        actorRole: session.user.role,
        action: "USER_DELETED",
        target: `user:${id}`,
        payload: { email: user.email },
      },
    });
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
