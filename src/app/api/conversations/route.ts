/**
 * ==============================================================================
 * API: /api/conversations
 * ==============================================================================
 * Manages user's conversation sessions with Redis caching and PostgreSQL persistence.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ChatRepository } from "@/server/db/chatRepository";

export async function GET() {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    const conversations = await ChatRepository.getUserConversations(userId);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error("Error in GET /api/conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id || session.user.email || "";
    await ChatRepository.clearAllConversations(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/conversations:", error);
    return NextResponse.json({ error: "Failed to clear conversations" }, { status: 500 });
  }
}
