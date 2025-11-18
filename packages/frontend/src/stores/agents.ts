import type { Chat } from "@ai-sdk/vue";
import { defineStore } from "pinia";
import { computed, markRaw, reactive, ref, shallowRef, watch } from "vue";
import type { WatchStopHandle } from "vue";

import { createAgent } from "@/agents/create";
import {
  type AgentRuntimeConfig,
  type AgentRuntimeConfigInput,
  createAgentRuntimeConfig,
  type CustomUIMessage,
  type ToolContext,
} from "@/agents/types";
import { useSDK } from "@/plugins/sdk";
import { useUIStore } from "@/stores/ui";

type AgentEntry = {
  chat: Chat<CustomUIMessage>;
  context: ToolContext;
  config: AgentRuntimeConfig;
};

type AgentStatusSnapshot = {
  sessionId: string;
  numMessages: number;
  status: Chat<CustomUIMessage>["status"];
  error?: Error;
};

type AgentStateListener = (snapshot: AgentStatusSnapshot[]) => void;

export const useAgentsStore = defineStore("stores.agents", () => {
  const agents = shallowRef<Map<string, AgentEntry>>(new Map());
  const selectedId = ref<string | undefined>(undefined);

  const sdk = useSDK();
  const uiStore = useUIStore();

  const agentStateListeners = new Set<AgentStateListener>();
  const agentStateWatchers = new Map<string, WatchStopHandle>();

  const getAgentStatusSnapshot = (): AgentStatusSnapshot[] => {
    return Array.from(agents.value.entries()).map(([sessionId, entry]) => ({
      sessionId,
      numMessages: entry.chat.messages.length,
      status: entry.chat.status,
      error: entry.chat.error,
    }));
  };

  const notifyAgentStateListeners = () => {
    const snapshot = getAgentStatusSnapshot();
    agentStateListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("[Shift Agents] Agent state listener failed", error);
      }
    });
  };

  const registerAgentWatcher = (
    sessionId: string,
    chat: Chat<CustomUIMessage>,
  ) => {
    const existingWatcher = agentStateWatchers.get(sessionId);
    if (existingWatcher) {
      existingWatcher();
    }

    const stopHandle = watch(
      () => ({
        status: chat.status,
        error: chat.error,
      }),
      () => {
        notifyAgentStateListeners();
      },
      { immediate: true },
    );

    agentStateWatchers.set(sessionId, stopHandle);
  };

  async function addAgent(
    replaySessionId: string,
    options?: AgentRuntimeConfigInput,
  ) {
    if (agents.value.has(replaySessionId)) {
      if (options !== undefined) {
        updateAgentConfig(replaySessionId, options);
      }
      return agents.value.get(replaySessionId)!;
    }

    const config = reactive(createAgentRuntimeConfig(options));
    const { chat, toolContext } = await createAgent({
      replaySessionId,
      sdk,
      config,
    });

    const entry: AgentEntry = {
      chat: markRaw(chat),
      context: toolContext,
      config,
    };

    agents.value.set(replaySessionId, entry);
    registerAgentWatcher(replaySessionId, chat);
    syncUiPrompts(replaySessionId, config);
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

  function getAgentConfig(replaySessionId: string) {
    return agents.value.get(replaySessionId)?.config;
  }

  function syncUiPrompts(replaySessionId: string, config: AgentRuntimeConfig) {
    const promptIds = config.customPrompts
      .map((prompt) => prompt.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    uiStore.setSelectedPrompts(replaySessionId, promptIds);
  }

  function applyConfigUpdates(
    target: AgentRuntimeConfig,
    updates: AgentRuntimeConfigInput,
  ) {
    if ("model" in updates) {
      target.model = updates.model;
    }

    if ("maxIterations" in updates) {
      target.maxIterations = updates.maxIterations;
    }

    if ("selections" in updates) {
      target.selections = updates.selections ? [...updates.selections] : [];
    }

    if ("customPrompts" in updates) {
      target.customPrompts = updates.customPrompts
        ? [...updates.customPrompts]
        : [];
    }
  }

  function updateAgentConfig(
    replaySessionId: string,
    updates:
      | AgentRuntimeConfigInput
      | ((current: AgentRuntimeConfig) => AgentRuntimeConfigInput | void),
  ) {
    const entry = agents.value.get(replaySessionId);
    if (entry === undefined) {
      return;
    }

    const resolvedUpdates =
      typeof updates === "function" ? updates(entry.config) : updates;

    if (!resolvedUpdates) {
      return;
    }

    applyConfigUpdates(entry.config, resolvedUpdates);

    if ("customPrompts" in resolvedUpdates) {
      syncUiPrompts(replaySessionId, entry.config);
    }
  }

  async function abortSelectedAgent() {
    if (selectedId.value === undefined) return;
    const agent = getAgent(selectedId.value);
    if (agent) {
      await agent.stop();
    }
  }

  const subscribeToAgentStates = (listener: AgentStateListener) => {
    agentStateListeners.add(listener);
    try {
      listener(getAgentStatusSnapshot());
    } catch (error) {
      console.error("[Shift Agents] Agent state listener failed", error);
    }
    return () => {
      agentStateListeners.delete(listener);
    };
  };

  const selectedAgent = computed(() => {
    if (selectedId.value === undefined) return undefined;
    return getAgent(selectedId.value);
  });

  const selectedToolContext = computed(() => {
    if (selectedId.value === undefined) return undefined;
    return getToolContext(selectedId.value);
  });

  return {
    agents: computed(() =>
      Array.from(agents.value.values()).map((e) => e.chat),
    ),
    addAgent,
    getAgent,
    getToolContext,
    getAgentConfig,
    selectedAgent,
    selectedToolContext,
    selectedId,
    selectAgent,
    abortSelectedAgent,
    subscribeToAgentStates,
    updateAgentConfig,
  };
});
