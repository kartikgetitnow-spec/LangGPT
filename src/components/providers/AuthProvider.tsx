"use client";

/**
 * ==============================================================================
 * AUTHENTICATION SESSION PROVIDER
 * ==============================================================================
 * Provides the NextAuth client session context across the React tree.
 */

import { SessionProvider } from "next-auth/react";
import React from "react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
