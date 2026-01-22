import { useClipboard } from "@vueuse/core";
import { computed, nextTick } from "vue";

import { useSession } from "../useSession";

import { useSDK } from "@/plugins/sdk";
import { useAgentStore } from "@/stores/agent/store";
import { useSettingsStore } from "@/stores/settings";
import { useUIStore } from "@/stores/ui";

export function useTopbar() {
  const session = useSession();
  const store = useAgentStore();
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();
  const sdk = useSDK();
  const { copy } = useClipboard();

  async function clearConversation() {
    session.store.clearQueuedMessages();
    if (session.isGenerating()) {
      await session.stopAndWait();
      session.resumeAfterStop();
    }

    await nextTick();
    session.chat.messages = [];
    session.clearTodos();
    session.persistMessages();
  }

  function closeDrawer() {
    uiStore.toggleDrawer();
  }

  function toggleDebugMode() {
    store.dispatch({ type: "TOGGLE_DEBUG_MODE" });
  }

  function copyAgentState() {
    const model = session.model;
    const modelInfo =
      model !== undefined
        ? { id: model.id, provider: model.provider }
        : { id: "unknown", provider: "unknown" };

    const draftMessage = session.store.draftMessage;
    const httpRequest = session.store.httpRequest;

    const state = [
      "=== Shift Agent State ===",
      `Session ID: ${session.id}`,
      `Chat Status: ${session.chat.status}`,
      "",
      "=== Model ===",
      `ID: ${modelInfo.id}`,
      `Provider: ${modelInfo.provider}`,
      "",
      "=== Messages ===",
      JSON.stringify(session.chat.messages, undefined, 2),
      "",
      "=== Todos ===",
      JSON.stringify(session.store.todos, undefined, 2),
      "",
      "=== Queued Messages ===",
      JSON.stringify(session.store.queuedMessages, undefined, 2),
      "",
      "=== Draft Message ===",
      draftMessage !== "" ? draftMessage : "(empty)",
      "",
      "=== HTTP Request ===",
      httpRequest !== "" ? httpRequest : "(empty)",
      "",
      "=== Snapshots ===",
      JSON.stringify(session.store.snapshots, undefined, 2),
      "",
      "=== Selected Skill IDs ===",
      JSON.stringify(session.store.selectedSkillIds, undefined, 2),
    ].join("\n");

    copy(state);

    sdk.window.showToast("Agent state copied to clipboard", {
      variant: "success",
    });
  }

  return {
    clearConversation,
    debugMode: computed(() => store.debugMode),
    debugToolsEnabled: computed(() => settingsStore.debugToolsEnabled ?? true),
    sessionID: session.id,
    toggleDebugMode,
    closeDrawer,
    copyAgentState,
  };
}
