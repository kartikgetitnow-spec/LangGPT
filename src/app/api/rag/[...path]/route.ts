import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

async function proxyRAG(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to use RAG document search." },
        { status: 401 }
      );
    }

    const { path } = await params;
    const subpath = path.join("/");
    const url = new URL(req.url);
    const queryString = url.search;

    const targetUrl = `${BACKEND_URL}/api/rag/${subpath}${queryString}`;
    const userId = session.user.id || session.user.email || "";
    const userEmail = session.user.email || "";

    const headers = new Headers();
    headers.set("x-user-id", userId);
    headers.set("x-user-email", userEmail);

    const contentType = req.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOptions.body = req.body;
      // @ts-ignore
      fetchOptions.duplex = "half";
    }

    const backendRes = await fetch(targetUrl, fetchOptions);

    // If streaming response (e.g. /api/rag/query)
    const isStream = backendRes.headers.get("content-type")?.includes("text/plain");
    if (isStream && backendRes.body) {
      return new Response(backendRes.body, {
        status: backendRes.status,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const data = await backendRes.text();
    return new Response(data, {
      status: backendRes.status,
      headers: {
        "Content-Type": backendRes.headers.get("content-type") || "application/json",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Proxy error in /api/rag:", err);
    return NextResponse.json({ error: `RAG Gateway error: ${msg}` }, { status: 502 });
  }
}

export const GET = proxyRAG;
export const POST = proxyRAG;
export const DELETE = proxyRAG;
