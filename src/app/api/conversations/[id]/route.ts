/**
 * ==============================================================================
 * API: /api/conversations/[id]
 * ==============================================================================
 * Single conversation operations: retrieve messages, rename, pin, and delete.
 * Accelerated with Redis cache.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ChatRepository } from "@/server/db/chatRepository";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const messages = await ChatRepository.getConversationMessages(id);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
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

    if (typeof body.title === "string") {
      await ChatRepository.renameConversation(id, userId, body.title);
      return NextResponse.json({ success: true, title: body.title });
    }

    if (body.togglePin) {
      const isPinned = await ChatRepository.togglePinConversation(id, userId);
      return NextResponse.json({ success: true, isPinned });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in PATCH /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth().catch(() => null);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id || session.user.email || "";
    await ChatRepository.deleteConversation(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/conversations/[id]:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
