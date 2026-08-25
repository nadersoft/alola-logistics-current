import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_UPDATE_AGE = 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string"? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string"? credentials.password : "";
        if (!email ||!password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          logger.warn({ email }, "auth:unknown-user");
          return null;
        }
        if (!user.isActive) {
          logger.warn({ email }, "auth:disabled-user");
          return null;
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          logger.warn({ email }, "auth:bad-password");
          return null;
        }
        logger.info({ userId: user.id }, "auth:login-success");
        return { id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger,...rest }) {
      if (user) {
        token.id = (user as { id?: string }).id?? "";
        token.role = (user as { role?: Role }).role?? "CLIENT";
        token.isActive = (user as { isActive?: boolean }).isActive?? true;
        token.loginTime = Date.now();
        token.lastActivity = Date.now();
        let ip = "unknown";
        try {
          const req = (rest as Record<string, unknown>).request as Request | undefined;
          const forwarded = req?.headers?.get("x-forwarded-for");
          if (forwarded) ip = forwarded.split(",")[0]?.trim()?? "unknown";
        } catch {}
        token.ip = ip;
        logger.info({ userId: token.id, ip }, "auth:session-created");
      }
      if (trigger === "update") {
        token.lastActivity = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      const now = Date.now();
      const lastActivity = (token.lastActivity as number)?? 0;
      if (lastActivity && now - lastActivity > SESSION_MAX_AGE * 1000) {
        logger.warn({ userId: token.id }, "auth:session-expired");
        return {...session, user: { id: "", name: "", email: "", role: "CLIENT" as Role } } as typeof session;
      }
      if (session.user) {
        session.user.id = (token as { id?: string }).id?? "";
        session.user.role = (token as { role?: Role }).role?? "CLIENT";
        session.user.isActive = (token as { isActive?: boolean }).isActive?? true;
        session.user.ip = (token as { ip?: string }).ip?? "unknown";
        session.user.loginTime = (token as { loginTime?: number }).loginTime?? null;
        session.user.lastActivity = (token as { lastActivity?: number }).lastActivity?? null;
      }
      return session;
    },
  },
});
export { SESSION_MAX_AGE, SESSION_UPDATE_AGE };
