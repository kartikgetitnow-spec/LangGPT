"use client";

/**
 * ==============================================================================
 * AUTHENTICATION SESSION PROVIDER
 * ==============================================================================
 * Seeds the NextAuth client session context with the server-rendered session,
 * eliminating the 1-second unauthenticated flash on page refresh.
 */

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import React from "react";

export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
