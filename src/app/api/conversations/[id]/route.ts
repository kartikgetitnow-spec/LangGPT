/**
 * ==============================================================================
 * API PROXY: /api/conversations/[id] -> Node.js Express Backend
 * ==============================================================================
 * Proxies single conversation operations (fetch messages, rename, pin, delete)
 * to the Node.js Express server on port 5000.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id || session.user.email || "";

    const backendRes = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`, {
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
    console.error("Proxy error in GET /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch messages from backend" }, { status: 502 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id || session.user.email || "";
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Proxy error in PATCH /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Failed to update conversation on backend" }, { status: 502 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id || session.user.email || "";

    const backendRes = await fetch(`${BACKEND_URL}/api/conversations/${encodeURIComponent(id)}`, {
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
    console.error("Proxy error in DELETE /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Failed to delete conversation on backend" }, { status: 502 });
  }
}
