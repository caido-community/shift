import { defineStore } from "pinia";
import { computed, readonly, shallowRef } from "vue";

import { type AgentMessage, type AgentModel, createInitialModel } from "./store.model";
import { update } from "./store.update";

import { AgentSession } from "@/agent/session";
import { useSDK } from "@/plugins/sdk";
import { removeSessionStore } from "@/stores/agent/session";
import { useModelsStore } from "@/stores/models/store";
import { useSettingsStore } from "@/stores/settings";
import { resolveModel } from "@/utils/ai";
import { isPresent } from "@/utils/optional";

export const useAgentStore = defineStore("agent", () => {
  const sdk = useSDK();
  const model = shallowRef<AgentModel>(createInitialModel());

  const modelsStore = useModelsStore();
  const settingsStore = useSettingsStore();

  const isReady = computed(() => {
    const modelsReady = !modelsStore.isLoading && isPresent(modelsStore.config);
    const settingsReady = !settingsStore.isLoading && isPresent(settingsStore.config);
    return modelsReady && settingsReady;
  });

  function dispatch(message: AgentMessage) {
    model.value = update(model.value, message);
  }

  function getSession(sessionId: string): AgentSession | undefined {
    if (model.value.sessions.has(sessionId)) {
      return model.value.sessions.get(sessionId);
    }

    if (!isReady.value) {
      return undefined;
    }

    return createSession(sessionId);
  }

  function createSession(sessionId: string): AgentSession {
    const modelData = resolveModel({
      sdk,
      savedModelKey: settingsStore.agentsModel,
      enabledModels: modelsStore.getEnabledModels({ usageType: "agent" }),
      usageType: "agent",
    });

    if (modelData === undefined) {
      throw new Error("No models available");
    }

    const session = new AgentSession(sdk, sessionId, modelData);
    dispatch({ type: "ADD_SESSION", sessionId, session });

    return session;
  }

  async function removeSession(sessionId: string) {
    dispatch({ type: "REMOVE_SESSION", sessionId });
    removeSessionStore(sessionId);
    await sdk.backend.removeAgent(sessionId);
  }

  const activeSession = computed(() => {
    const selectedId = model.value.selectedSessionId;
    if (selectedId === undefined) {
      return undefined;
    }
    return getSession(selectedId);
  });

  const debugMode = computed(() => model.value.debugMode);
  const selectedSessionId = computed(() => model.value.selectedSessionId);

  return {
    state: readonly(model),
    sdk,
    dispatch,
    isReady,
    activeSession,
    selectedSessionId,
    debugMode,
    getSession,
    removeSession,
  };
});
