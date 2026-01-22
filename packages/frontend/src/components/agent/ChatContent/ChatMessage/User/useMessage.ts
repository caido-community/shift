import type { ShiftMessage } from "shared";
import { computed } from "vue";

import { useSession } from "../../../useSession";

import { useSDK } from "@/plugins/sdk";
import { writeToRequestEditor } from "@/utils/caido";
import { isPresent } from "@/utils/optional";

type MessagePartLike = { type: string; text?: string };

export function useUserMessage() {
  const session = useSession();
  const sdk = useSDK();

  async function editMessage(message: ShiftMessage & { role: "user" }) {
    session.store.clearQueuedMessages();
    await session.stopAndWait();
    session.resumeAfterStop();

    const messages = session.chat.messages;
    const index = messages.findIndex((m) => m.id === message.id);
    if (index === -1) {
      return;
    }

    const text = (message.parts as MessagePartLike[])
      .filter((p) => p !== undefined && p.type === "text" && p.text !== undefined)
      .map((p) => p?.text ?? "")
      .join("");

    session.chat.messages = messages.slice(0, index);
    session.draftMessage = text;
    session.persistMessages();
  }

  async function revertToSnapshot(messageId: string) {
    session.store.clearQueuedMessages();
    await session.stopAndWait();
    session.resumeAfterStop();

    const result = session.store.restoreSnapshot(messageId);
    if (result.kind === "Error") {
      return;
    }

    const messages = session.chat.messages;
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      return;
    }

    session.chat.messages = messages.slice(0, index);
    session.persistMessages();

    if (location.hash === "#/replay") {
      const currentSession = sdk.replay.getCurrentSession();
      if (isPresent(currentSession) && currentSession.id === session.id) {
        writeToRequestEditor(result.value);
      }
    }
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
