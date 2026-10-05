/**
 * ==============================================================================
 * API ENDPOINT: /api/context
 * ==============================================================================
 * REST endpoints for managing the narrative user profile and context memory in localdb.
 * 
 * - GET: Retrieve the current living profile paragraph.
 * - POST: Save manual edits or updates to the profile paragraph.
 * - DELETE: Reset/clear the profile memory back to an empty slate.
 */

import { NextRequest, NextResponse } from "next/server";
import { localContextDb } from "@/server/db/localDb";

export async function GET() {
  try {
    const profile = await localContextDb.getProfile();
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const profileText = typeof body.profileText === "string" ? body.profileText : "";

    const updated = await localContextDb.updateProfile(profileText);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const reset = await localContextDb.clearProfile();
    return NextResponse.json(reset);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
