import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  clearFailedLogins,
  ensureAdminPasswordConfigured,
  getClientKey,
  isRateLimited,
  recordFailedLogin,
  verifyAdminPassword,
} from "@/lib/admin-auth-security";

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const clientKey = getClientKey(request);
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        const config = ensureAdminPasswordConfigured();
        if (!config.ok) {
          console.error(config.reason);
          return null;
        }

        if (await isRateLimited(clientKey)) {
          console.warn(`Admin login rate limited for ${clientKey}.`);
          return null;
        }

        if (await verifyAdminPassword(password)) {
          await clearFailedLogins(clientKey);
          return {
            id: "1",
            name: "Admin",
            email: "admin@blog.local",
          };
        }

        await recordFailedLogin(clientKey);
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig;

export const { handlers, auth } = NextAuth(authConfig);

export function getAuthSession() {
  return auth();
}
