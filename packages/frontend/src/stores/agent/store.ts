import type { ChatStatus } from "ai";
import { defineStore } from "pinia";
import { computed, shallowRef, watch } from "vue";

import { AgentSession } from "@/agent/session";
import { useSDK } from "@/plugins/sdk";
import { useModelsStore } from "@/stores/models/store";
import { useSettingsStore } from "@/stores/settings";
import { resolveModel } from "@/utils/ai";

type AgentIndicatorState = {
  hasMessages: boolean;
  status: ChatStatus;
};

export const useAgentStore = defineStore("agent", () => {
  const sdk = useSDK();
  const sessions = shallowRef(new Map<string, AgentSession>());
  const persistedSessionIds = shallowRef(new Set<string>());
  const selectedSessionId = shallowRef<string>();
  const debugMode = shallowRef(false);

  const modelsStore = useModelsStore();
  const settingsStore = useSettingsStore();

  const isReady = computed(() => {
    const modelsReady = !modelsStore.isLoading;
    const settingsReady = settingsStore.isLoaded;
    return modelsReady && settingsReady;
  });

  async function loadPersistedSessionIds() {
    const result = await sdk.backend.getAgents();
    if (result.kind === "Ok") {
      const sessionIds = result.value
        .filter((agent) => agent.messages.length > 0)
        .map((agent) => agent.chatID);
      persistedSessionIds.value = new Set(sessionIds);
    }
  }

  loadPersistedSessionIds();

  function selectSession(sessionId: string) {
    selectedSessionId.value = sessionId;
  }

  function clearSessionSelection() {
    selectedSessionId.value = undefined;
  }

  function toggleDebugMode() {
    debugMode.value = !debugMode.value;
  }

  function getSession(sessionId: string): AgentSession | undefined {
    if (sessions.value.has(sessionId)) {
      return sessions.value.get(sessionId);
    }

    if (!isReady.value) {
      return undefined;
    }

    return createSession(sessionId);
  }

  async function openSession(sessionId: string): Promise<AgentSession | undefined> {
    const session = getSession(sessionId);
    await session?.loaded;
    return session;
  }

  function createSession(sessionId: string): AgentSession {
    const modelData = resolveModel({
      sdk,
      savedModelKey: settingsStore.config.agentsModel,
      enabledModels: modelsStore.getEnabledModels(),
      usageType: "agent",
    });

    const session = new AgentSession(sdk, sessionId, modelData);
    sessions.value = new Map(sessions.value).set(sessionId, session);

    return session;
  }

  async function removeSession(sessionId: string) {
    sessions.value.get(sessionId)?.dispose();
    const nextSessions = new Map(sessions.value);
    nextSessions.delete(sessionId);
    sessions.value = nextSessions;
    const nextPersistedIds = new Set(persistedSessionIds.value);
    nextPersistedIds.delete(sessionId);
    persistedSessionIds.value = nextPersistedIds;
    await sdk.backend.removeAgent(sessionId);
  }

  function reset() {
    for (const session of sessions.value.values()) {
      session.dispose();
    }
    sessions.value = new Map();
    persistedSessionIds.value = new Set();
    selectedSessionId.value = undefined;
    debugMode.value = false;
    loadPersistedSessionIds();
  }

  watch(
    [selectedSessionId, isReady],
    ([sessionId]) => {
      if (sessionId !== undefined) {
        getSession(sessionId);
      }
    },
    { immediate: true }
  );

  const activeSession = computed(() => {
    const selectedId = selectedSessionId.value;
    return selectedId === undefined ? undefined : sessions.value.get(selectedId);
  });

  const indicatorStates = computed(() => {
    const states = new Map<string, AgentIndicatorState>();
    for (const sessionId of persistedSessionIds.value) {
      states.set(sessionId, { hasMessages: true, status: "ready" });
    }
    for (const [sessionId, session] of sessions.value) {
      states.set(sessionId, {
        hasMessages: session.chat.messages.length > 0,
        status: session.chat.status,
      });
    }
    return states;
  });

  return {
    sdk,
    isReady,
    sessions: computed(() => sessions.value),
    activeSession,
    selectedSessionId: computed(() => selectedSessionId.value),
    debugMode: computed(() => debugMode.value),
    indicatorStates,
    selectSession,
    clearSessionSelection,
    toggleDebugMode,
    getSession,
    openSession,
    removeSession,
    reset,
  };
});
