import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 简单的明文密码验证，仅用于演示
        // 在生产环境中应该使用加密密码
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        // Prisma client types used by next-auth adapter may not expose `password` in
        // certain selections. Cast to include password for local comparison below.
        const userWithPassword = user as (typeof user & { password?: string } | null);

        if (!user) {
          return null;
        }

        // 注意：这里简化了密码验证
        // 在生产环境中，你应该使用bcrypt等加密库
        // Use bcryptjs to compare hashed passwords. `bcryptjs` is in dependencies.
        const bcrypt = await import("bcryptjs");
        const isValid = await bcrypt.compare(
          credentials.password as string,
          userWithPassword?.password ?? ""
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
  session: {
    strategy: "jwt",
  },
  // Ensure NextAuth has a secret for signing/verifying JWTs. NextAuth will also read
  // NEXTAUTH_SECRET from env automatically, but we provide a fallback to AUTH_SECRET
  // to match this project's env naming.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
} satisfies NextAuthConfig;