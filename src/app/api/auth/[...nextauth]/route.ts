/**
 * ==============================================================================
 * NEXTAUTH ROUTE HANDLER (/api/auth/[...nextauth])
 * ==============================================================================
 * Exposes GET and POST HTTP endpoints for OAuth and Credentials authentication.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
