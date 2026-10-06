/**
 * ==============================================================================
 * API PROXY: /api/conversations -> Node.js Express Backend
 * ==============================================================================
 * Proxies conversation list queries and batch deletions to Node.js backend.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    const backendRes = await fetch(`${BACKEND_URL}/api/conversations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Proxy error in GET /api/conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations from backend" }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    const backendRes = await fetch(`${BACKEND_URL}/api/conversations`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Proxy error in DELETE /api/conversations:", error);
    return NextResponse.json({ error: "Failed to clear conversations" }, { status: 502 });
  }
}
