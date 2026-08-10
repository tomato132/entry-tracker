import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { adminEmails } from "@/lib/admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const parsed = registerSchema.safeParse(creds);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        // 每次登录按 ADMIN_EMAILS 校准角色（名单变更即时生效）
        const role = adminEmails().includes(email) ? "ADMIN" : "USER";
        if (role !== user.role) {
          await prisma.user.update({ where: { id: user.id }, data: { role } });
        }
        return { id: user.id, email: user.email, role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (token.role === "USER" || token.role === "ADMIN") session.user.role = token.role;
      return session;
    },
  },
});
