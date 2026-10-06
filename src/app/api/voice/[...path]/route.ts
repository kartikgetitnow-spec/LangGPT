import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

async function proxyVoice(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    const subpath = path.join("/");
    const url = new URL(req.url);
    const queryString = url.search;

    const targetUrl = `${BACKEND_URL}/api/voice/${subpath}${queryString}`;

    const headers = new Headers();
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
    const data = await backendRes.text();

    return new Response(data, {
      status: backendRes.status,
      headers: {
        "Content-Type": backendRes.headers.get("content-type") || "application/json",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Proxy error in /api/voice:", err);
    return NextResponse.json({ error: `Voice Gateway error: ${msg}` }, { status: 502 });
  }
}

export const GET = proxyVoice;
export const POST = proxyVoice;
