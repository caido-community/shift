import { useClipboard } from "@vueuse/core";
import { computed } from "vue";

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

  function closeDrawer() {
    uiStore.toggleDrawer();
  }

  function toggleDebugMode() {
    store.toggleDebugMode();
  }

  function copyAgentState() {
    const model = session.store.model;
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
    hasMessages: computed(() => session.chat.messages.length > 0),
    clearConversation: () => session.clear(),
    debugMode: computed(() => store.debugMode),
    debugToolsEnabled: computed(() => settingsStore.config.debugToolsEnabled),
    sessionID: session.id,
    toggleDebugMode,
    closeDrawer,
    copyAgentState,
  };
}
