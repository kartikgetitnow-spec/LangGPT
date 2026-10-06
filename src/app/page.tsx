import { cookies } from "next/headers";
import { auth } from "@/auth";
import { ChatRepository } from "@/server/db/chatRepository";
import { ChatClientLayout } from "@/components/chat/ChatClientLayout";
import { Conversation } from "@/types/chat";

export default async function Home() {
  const session = await auth().catch(() => null);
  const cookieStore = await cookies();
  const activeIdCookie = cookieStore.get("langgpt_active_id")?.value || null;
  const selectedModelCookie = cookieStore.get("langgpt_selected_model")?.value || null;

  let initialConversations: Conversation[] = [];
  let initialActiveId: string | null = null;

  if (session?.user) {
    const userId = session.user.id || session.user.email || "";
    try {
      initialConversations = await ChatRepository.getUserConversations(userId);
      if (initialConversations.length > 0) {
        if (activeIdCookie === "new") {
          initialActiveId = null;
        } else if (activeIdCookie && initialConversations.some((c) => c.id === activeIdCookie)) {
          initialActiveId = activeIdCookie;
        } else {
          initialActiveId = initialConversations[0].id;
        }
      }
    } catch (e) {
      console.error("Failed to load initial conversations:", e);
    }
  }

  return (
    <ChatClientLayout
      initialConversations={initialConversations}
      initialActiveId={initialActiveId}
      initialSelectedModel={selectedModelCookie}
    />
  );
}
