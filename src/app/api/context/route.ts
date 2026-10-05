/**
 * ==============================================================================
 * API ENDPOINT: /api/context
 * ==============================================================================
 * REST endpoints for managing Global Context Awareness and User Preferences in localdb.
 * 
 * - GET: Retrieve current user preferences, custom instructions, and learned context.
 * - POST: Update preferences or add a custom rule.
 * - DELETE: Delete a specific rule/learned preference or clear all context data.
 */

import { NextRequest, NextResponse } from "next/server";
import { localContextDb } from "@/server/db/localDb";

export async function GET() {
  try {
    const preferences = await localContextDb.getPreferences();
    return NextResponse.json(preferences);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if adding a single custom rule
    if (body.action === "add_rule" && typeof body.rule === "string") {
      const updated = await localContextDb.addCustomRule(body.rule);
      return NextResponse.json(updated);
    }

    // Standard preferences update (name, role, codingStyle, tone, preferredLanguages)
    const updated = await localContextDb.updatePreferences(body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const indexStr = searchParams.get("index");
    const index = indexStr !== null ? parseInt(indexStr, 10) : -1;

    if (action === "clear_all") {
      const reset = await localContextDb.clearAllContext();
      return NextResponse.json(reset);
    }

    if (action === "delete_rule" && index >= 0) {
      const updated = await localContextDb.deleteCustomRule(index);
      return NextResponse.json(updated);
    }

    if (action === "delete_learned" && index >= 0) {
      const updated = await localContextDb.deleteLearnedPreference(index);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Invalid action or index" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
