import NextAuth, { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createHash, timingSafeEqual } from "node:crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

function getClientKey(request?: Request) {
  const forwardedFor = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request?.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local";
}

function pruneLoginAttempts(now: number) {
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.firstAttemptAt >= LOGIN_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}

function isRateLimited(key: string) {
  const now = Date.now();
  pruneLoginAttempts(now);
  const attempt = loginAttempts.get(key);
  return Boolean(attempt && attempt.count >= MAX_LOGIN_ATTEMPTS);
}

function recordFailedLogin(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt || now - attempt.firstAttemptAt >= LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return;
  }

  attempt.count += 1;
}

function clearFailedLogins(key: string) {
  loginAttempts.delete(key);
}

function safeCompare(value: string, expected: string) {
  const valueHash = createHash("sha256").update(value).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(valueHash, expectedHash);
}

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

        if (!ADMIN_PASSWORD) {
          console.error("ADMIN_PASSWORD is not configured.");
          return null;
        }

        if (isRateLimited(clientKey)) {
          console.warn(`Admin login rate limited for ${clientKey}.`);
          return null;
        }

        if (safeCompare(password, ADMIN_PASSWORD)) {
          clearFailedLogins(clientKey);
          return {
            id: "1",
            name: "Admin",
            email: "admin@blog.local",
          };
        }

        recordFailedLogin(clientKey);
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
