/**
 * ==============================================================================
 * API PROXY: /api/context -> Node.js Express Backend
 * ==============================================================================
 * Proxies user context profile retrieval and updates to Node.js backend.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    const backendRes = await fetch(`${BACKEND_URL}/api/context`, {
      headers: {
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    const backendRes = await fetch(`${BACKEND_URL}/api/context`, {
      method: "DELETE",
      headers: {
        "x-user-id": userId,
        cookie: req.headers.get("cookie") || "",
      },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
