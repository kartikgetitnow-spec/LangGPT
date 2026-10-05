import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const externalBackend = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

    // If an external backend is specified, proxy the request to it
    if (externalBackend && !externalBackend.startsWith("/api/chat")) {
      const response = await fetch(externalBackend, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Default route handler response when no backend is configured yet
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const message = `Hello! The frontend is connected to \`/api/chat\`. Since you are handling the backend, you can connect your backend logic in \`src/app/api/chat/route.ts\` or point \`NEXT_PUBLIC_BACKEND_URL\` to your backend server.`;

        controller.enqueue(encoder.encode(message));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
