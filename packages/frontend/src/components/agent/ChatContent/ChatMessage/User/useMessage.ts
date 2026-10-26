import type { ShiftMessage } from "shared";
import { computed } from "vue";

import { useSession } from "../../../useSession";

type MessagePartLike = { type: string; text?: string };

export function useUserMessage() {
  const session = useSession();

  async function editMessage(message: ShiftMessage & { role: "user" }) {
    const text = (message.parts as MessagePartLike[])
      .filter((p) => p !== undefined && p.type === "text" && p.text !== undefined)
      .map((p) => p?.text ?? "")
      .join("");

    if (await session.truncateBefore(message.id)) {
      session.store.setDraftMessage(text);
    }
  }

  function revertToSnapshot(messageId: string) {
    return session.revertTo(messageId);
  }

  function hasSnapshot(messageId: string): boolean {
    return session.store.hasSnapshot(messageId);
  }

  return {
    editMessage,
    revertToSnapshot,
    hasSnapshot,
    isGenerating: computed(() => session.isGenerating()),
  };
}
