/**
 * ==============================================================================
 * API ENDPOINT: /api/context
 * ==============================================================================
 * REST endpoints for managing the narrative user profile and context memory in PostgreSQL/localdb.
 * Scoped strictly to authenticated users.
 * 
 * - GET: Retrieve the current living profile paragraph.
 * - POST: Save manual edits or updates to the profile paragraph.
 * - DELETE: Reset/clear the profile memory back to an empty slate.
 */

import { NextRequest, NextResponse } from "next/server";
import { localContextDb } from "@/server/db/localDb";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in to view context profile." },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || undefined;
    const profile = await localContextDb.getProfile(userId);
    return NextResponse.json(profile);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in to update context profile." },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || undefined;
    const body = await req.json();
    const profileText = typeof body.profileText === "string" ? body.profileText : "";

    const updated = await localContextDb.updateProfile(profileText, userId);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in to reset context profile." },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email || undefined;
    const reset = await localContextDb.clearProfile(userId);
    return NextResponse.json(reset);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
