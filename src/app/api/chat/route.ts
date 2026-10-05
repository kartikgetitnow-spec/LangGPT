/**
 * ==============================================================================
 * API PROXY CONTROLLER: /api/chat -> Node.js Express Backend
 * ==============================================================================
 * Proxies chat requests to the dedicated Node.js Express server on port 5000.
 * Injects authenticated NextAuth identity headers and streams the SSE response.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You must be logged in to chat with LangGPT. Please sign in to continue.",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || "";
    const userEmail = session.user.email || "";
    const userName = session.user.name || "";
    const body = await req.json();

    // 2. Forward request to dedicated Node.js Express backend
    const backendRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-user-email": userEmail,
        "x-user-name": userName,
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    if (!backendRes.ok) {
      const errorText = await backendRes.text();
      return new Response(errorText, {
        status: backendRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Pipe backend streaming response directly to client
    return new Response(backendRes.body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Backend Gateway Error";
    console.error("Proxy error in /api/chat:", error);
    return NextResponse.json(
      { error: `Backend service error: ${errorMsg}` },
      { status: 502 }
    );
  }
}
