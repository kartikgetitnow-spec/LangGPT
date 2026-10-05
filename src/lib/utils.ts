export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function groupConversationsByDate<T extends { updatedAt: string }>(
  conversations: T[]
): { label: string; items: T[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const sevenDaysAgo = today - 7 * 86400000;
  const thirtyDaysAgo = today - 30 * 86400000;

  const groups: { [key: string]: T[] } = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: [],
  };

  conversations.forEach((item) => {
    const itemTime = new Date(item.updatedAt).getTime();
    if (itemTime >= today) {
      groups["Today"].push(item);
    } else if (itemTime >= yesterday) {
      groups["Yesterday"].push(item);
    } else if (itemTime >= sevenDaysAgo) {
      groups["Previous 7 Days"].push(item);
    } else if (itemTime >= thirtyDaysAgo) {
      groups["Previous 30 Days"].push(item);
    } else {
      groups["Older"].push(item);
    }
  });

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
