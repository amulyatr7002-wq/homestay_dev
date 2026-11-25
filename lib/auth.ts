import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientAddress, rateLimit } from "@/lib/rate-limit";

const credentialSchema = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const address = clientAddress(new Headers(request.headers as HeadersInit));
        const limit = await rateLimit(`credentials:${address}`, 8, 15 * 60 * 1000);
        if (!limit.allowed) return null;

        const parsed = credentialSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, name: true, email: true, image: true, passwordHash: true, role: true, suspendedAt: true },
        });
        if (!user?.passwordHash || user.suspendedAt || !(await compare(parsed.data.password, user.passwordHash))) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id;
        const role = "role" in user ? user.role : undefined;
        token.role = role === "HOST" || role === "ADMIN" ? role : "GUEST";
      }
      if (trigger === "update" && token.sub) {
        const account = await prisma.user.findUnique({ where: { id: token.sub }, select: { role: true, suspendedAt: true } });
        token.role = account && !account.suspendedAt ? account.role : "GUEST";
        token.suspended = !account || Boolean(account.suspendedAt);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role === "HOST" || token.role === "ADMIN" ? token.role : "GUEST";
      }
      return session;
    },
  },
};
