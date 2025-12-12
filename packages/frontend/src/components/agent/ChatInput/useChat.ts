import { computed } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useAgentsStore } from "@/stores/agents";
import { useUIStore } from "@/stores/ui";

export const useChat = () => {
  const agentStore = useAgentsStore();
  const uiStore = useUIStore();
  const sdk = useSDK();

  const inputMessage = computed({
    get: () => uiStore.getInput(agentStore.selectedId ?? ""),
    set: (value: string) => {
      uiStore.setInput(agentStore.selectedId ?? "", value);
    },
  });

  const isEditingMessage = computed(
    () => uiStore.getInput(agentStore.selectedId ?? "") !== "",
  );

  const isAgentIdle = computed(
    () => agentStore.selectedAgent?.status === "ready",
  );

  const canSendMessage = computed(() => {
    return isAgentIdle.value && inputMessage.value.trim() !== "";
  });

  const messages = computed(() => {
    if (!agentStore.selectedAgent) {
      return [];
    }

    return agentStore.selectedAgent.messages;
  });

  const sendMessage = (message: string) => {
    if (!agentStore.selectedAgent) {
      return;
    }

    try {
      agentStore.selectedAgent.sendMessage({ text: message });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      sdk.window.showToast(`Error sending message: ${errorMessage}`, {
        variant: "error",
      });
    }
  };

  const handleSend = () => {
    if (!canSendMessage.value) {
      return;
    }

    const message = inputMessage.value.trim();
    inputMessage.value = "";

    sendMessage(message);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.stopPropagation();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const abortMessage = () => {
    agentStore.abortSelectedAgent();
  };

  const editMessage = (messageId: string, content: string) => {
    const agent = agentStore.selectedAgent;
    const agentId = agentStore.selectedId;
    if (!agent || agentId === undefined) {
      return;
    }

    agentStore.abortSelectedAgent();

    const index = agent.messages.findIndex((m) => m.id === messageId);
    if (index === -1) {
      return;
    }

    agent.messages = agent.messages.slice(0, index);
    uiStore.setInput(agentId, content);
  };

  const clearInputMessage = () => {
    uiStore.setInput(agentStore.selectedId ?? "", "");
  };

  return {
    messages,
    inputMessage,
    isEditingMessage,
    isAgentIdle,
    canSendMessage,
    sendMessage,
    abortMessage,
    editMessage,
    clearInputMessage,
    handleSend,
    handleKeydown,
  };
};
