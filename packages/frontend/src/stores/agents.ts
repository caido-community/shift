import type { Chat } from "@ai-sdk/vue";
import { defineStore } from "pinia";
import { computed, markRaw, ref, shallowRef, watch } from "vue";

import { createAgent } from "@/agents/create";
import type { CustomUIMessage, ToolContext } from "@/agents/types";
import { useSDK } from "@/plugins/sdk";

type AgentEntry = {
  chat: Chat<CustomUIMessage>;
  context: ToolContext;
};

export const useAgentsStore = defineStore("stores.agents", () => {
  const agents = shallowRef<Map<string, AgentEntry>>(new Map());
  const selectedId = ref<string | undefined>(undefined);

  const sdk = useSDK();

  async function addAgent(replaySessionId: string) {
    if (agents.value.has(replaySessionId)) {
      return agents.value.get(replaySessionId)!;
    }

    const { chat, toolContext } = await createAgent({
      replaySessionId,
      sdk,
    });

    const entry: AgentEntry = {
      chat: markRaw(chat),
      context: toolContext,
    };

    agents.value.set(replaySessionId, entry);
    return entry;
  }

  async function selectAgent(replaySessionId: string) {
    if (!agents.value.has(replaySessionId)) {
      await addAgent(replaySessionId);
    }
    selectedId.value = replaySessionId;
  }

  function getAgent(replaySessionId: string) {
    return agents.value.get(replaySessionId)?.chat;
  }

  function getToolContext(replaySessionId: string) {
    return agents.value.get(replaySessionId)?.context;
  }

  async function abortSelectedAgent() {
    if (selectedId.value === undefined) return;
    const agent = getAgent(selectedId.value);
    if (agent) {
      await agent.stop();
    }
  }

  const selectedAgent = computed(() => {
    if (selectedId.value === undefined) return undefined;
    return getAgent(selectedId.value);
  });

  const selectedToolContext = computed(() => {
    if (selectedId.value === undefined) return undefined;
    return getToolContext(selectedId.value);
  });

  // TODO: Temporary workaround for abort error, seems to be a bug in the ai-sdk
  const error = computed(() => selectedAgent.value?.error);
  watch(error, (error) => {
    if (selectedId.value === undefined) return;

    // recover from abort error
    if (error?.message !== undefined && error.message.includes("abort")) {
      const agent = getAgent(selectedId.value);
      if (agent !== undefined) {
        agent.clearError();
        agent.messages.map((m) => {
          if (m.metadata?.state === "streaming") {
            m.metadata.state = "abort";
          }
        });
      }
    }
  });

  return {
    agents: computed(() =>
      Array.from(agents.value.values()).map((e) => e.chat),
    ),
    addAgent,
    getAgent,
    getToolContext,
    selectedAgent,
    selectedToolContext,
    selectedId,
    selectAgent,
    abortSelectedAgent,
  };
});
