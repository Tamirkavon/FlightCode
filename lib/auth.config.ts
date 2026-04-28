import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Edge-compatible auth config — no Prisma imports
export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        // Full auth logic lives in lib/auth.ts (Node.js only)
        return null;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isPublic =
        request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/api/auth");
      if (isPublic) return true;
      return isLoggedIn;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};
