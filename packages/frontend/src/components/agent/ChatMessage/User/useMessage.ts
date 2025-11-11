import { computed } from "vue";

import type { CustomUIMessage } from "@/agents/types";
import { useAgentsStore } from "@/stores/agents";
import { useUIStore } from "@/stores/ui";

type MessagePartLike = { type: string; text?: string };

export const useUserMessage = () => {
  const agentStore = useAgentsStore();
  const uiStore = useUIStore();

  const selectedAgent = computed(() => agentStore.selectedAgent);

  const isGenerating = computed(() => {
    return selectedAgent.value?.status === "streaming";
  });

  const handleMessageClick = async (
    message: CustomUIMessage & { role: "user" },
  ) => {
    const agent = selectedAgent.value;
    const agentId = agentStore.selectedId;
    if (!agent || agentId === undefined) {
      return;
    }

    await agentStore.abortSelectedAgent();

    const index = agent.messages.findIndex((m) => m.id === message.id);
    if (index === -1) {
      return;
    }

    const text = (message.parts as MessagePartLike[])
      .filter(
        (p) => p !== undefined && p.type === "text" && p.text !== undefined,
      )
      .map((p) => p?.text ?? "")
      .join("");

    //TODO: figure out if there is a cleaner way, it breaks randomly if we dont do this
    setTimeout(() => {
      agent.messages = agent.messages.slice(0, index);
    }, 100);

    uiStore.setInput(agentId, text);
  };

  return {
    isGenerating,
    handleMessageClick,
  };
};
