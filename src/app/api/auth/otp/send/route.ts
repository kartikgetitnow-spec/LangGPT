/**
 * ==============================================================================
 * API PROXY: /api/auth/otp/send -> Node.js Express Backend
 * ==============================================================================
 * Proxies OTP dispatch requests to the Node.js Express server.
 */

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error) {
    console.error("Proxy error in /api/auth/otp/send:", error);
    return NextResponse.json(
      { error: "Failed to dispatch verification code from backend." },
      { status: 502 }
    );
  }
}
