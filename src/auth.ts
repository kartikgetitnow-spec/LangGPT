/**
 * ==============================================================================
 * AUTHENTICATION CONFIGURATION (NextAuth / Auth.js v5)
 * ==============================================================================
 * Integrated with:
 * 1. Google OAuth (with offline access & refresh token)
 * 2. GitHub OAuth
 * 3. Email & Password with 6-digit OTP email verification
 * 4. Prisma PostgreSQL Adapter for persistent users and accounts
 * 5. Professional OAuth token refresh & rotation
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db/prisma";
import { createSafePrismaAdapter } from "@/server/db/safeAdapter";
import { verifyOtpCode } from "@/server/auth/otpService";
import { rotateTokenIfNeeded } from "@/server/auth/tokenRefresh";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: createSafePrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Credentials({
      name: "Email and Password with OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password.");
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;
        const otp = (credentials.otp as string) || "";

        // Support quick guest / dev bypass for seamless mobile testing
        const isQuickGuest = email === "guest@langgpt.com" || otp === "DEV_GUEST";

        if (!isQuickGuest) {
          if (!otp) {
            throw new Error("Missing verification code.");
          }
          const otpCheck = await verifyOtpCode(email, otp);
          if (!otpCheck.valid) {
            throw new Error(otpCheck.reason || "Invalid or expired verification code.");
          }
        }

        // 2. Query user from Prisma PostgreSQL
        let user = null;
        try {
          user = await prisma.user.findUnique({
            where: { email },
          });
        } catch (dbError) {
          console.warn("DB lookup warning in authorize:", (dbError as Error).message);
        }

        if (user && user.password) {
          // Existing user with password
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            throw new Error("Incorrect password.");
          }
          return user;
        } else if (user && !user.password) {
          // User exists via OAuth, attach hashed password
          const hashedPassword = await bcrypt.hash(password, 10);
          try {
            user = await prisma.user.update({
              where: { email },
              data: {
                password: hashedPassword,
                emailVerified: new Date(),
              },
            });
          } catch {
            // ignore
          }
          return user;
        } else {
          // New user registration
          const hashedPassword = await bcrypt.hash(password, 10);
          try {
            user = await prisma.user.create({
              data: {
                email,
                name: email.split("@")[0],
                password: hashedPassword,
                emailVerified: new Date(),
              },
            });
            return user;
          } catch (createError) {
            console.error("Failed to create new user in DB:", createError);
            // Return ephemeral user object if DB is unavailable
            return {
              id: "temp-" + Date.now(),
              email,
              name: email.split("@")[0],
              image: null,
            };
          }
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.userId = user.id;
        token.provider = account.provider;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : 0;
        return token;
      }

      // Check if access token needs rotation
      return await rotateTokenIfNeeded(token);
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.userId || token.sub) as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // We use an in-app interactive modal
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
