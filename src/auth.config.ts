import type { NextAuthConfig } from "next-auth";

// Edge-compatible config: NO bcryptjs, NO Prisma, NO Node.js-only modules.
// Used by middleware (Edge Runtime). Full auth.ts extends this.
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" as const },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        if (token.teamId) {
          (session.user as Record<string, unknown>).teamId = token.teamId;
          (session.user as Record<string, unknown>).teamSlug = token.teamSlug;
          (session.user as Record<string, unknown>).role = token.role;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
