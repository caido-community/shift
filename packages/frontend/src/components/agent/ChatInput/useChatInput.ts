import { useFocus } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { createModelKey, type Model } from "shared";
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";

import { useSession } from "../useSession";

import { useResize } from "./useResize";

import { useSDK } from "@/plugins/sdk";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { updateSettings } from "@/stores/settings/store.effects";
import { isAnyProviderConfigured, resolveModel } from "@/utils/ai";

export function useChatInput() {
  const sdk = useSDK();
  const modelsStore = useModelsStore();
  const settingsStore = useSettingsStore();
  const textarea = useTemplateRef<HTMLTextAreaElement>("textarea");
  const session = useSession();
  const { draftMessage } = storeToRefs(session.store);
  const inputMessage = ref(draftMessage.value ?? "");

  onBeforeUnmount(() => {
    if (inputMessage.value.trim() !== "") {
      session.draftMessage = inputMessage.value;
    }
  });

  const agentModels = computed(() => modelsStore.getEnabledModels({ usageType: "agent" }));

  const { height, startResize } = useResize();

  useFocus(textarea, { initialValue: true });

  watch(
    draftMessage,
    (draft) => {
      if (draft !== "") {
        inputMessage.value = draft;
        session.draftMessage = "";
      }
    },
    { immediate: true }
  );

  const handleModelUpdate = (value: Model | undefined) => {
    session.model = value;
    if (value === undefined) return;
    const key = createModelKey(value.provider, value.id);
    updateSettings(settingsStore.sdk, settingsStore.dispatch, { agentsModel: key });
  };

  const model = computed({
    get: () => session.model,
    set: handleModelUpdate,
  });
  const resolvedModel = computed(() =>
    resolveModel({
      sdk,
      savedModelKey: settingsStore.agentsModel,
      enabledModels: agentModels.value,
      usageType: "agent",
    })
  );

  watch(
    [resolvedModel, model],
    ([resolved, current]) => {
      if (current === undefined && resolved !== undefined) {
        handleModelUpdate(resolved);
      }
    },
    { immediate: true }
  );
  const isGenerating = computed(() => session.isGenerating());
  const hasProviderConfigured = computed(() => isAnyProviderConfigured(sdk));
  const hasMessage = computed(() => inputMessage.value.trim() !== "");
  const canSend = computed(
    () => hasMessage.value && hasProviderConfigured.value && model.value !== undefined
  );

  function handleSend() {
    if (!canSend.value) return;

    const message = inputMessage.value.trim();
    inputMessage.value = "";

    if (isGenerating.value) {
      session.addToQueue(message);
    } else {
      session.chat.sendMessage({ text: message });
    }
  }

  async function handleStop() {
    await session.stopAndWait();

    if (!session.hasExecutedToolsSinceLastUserMessage()) {
      const lastMessage = session.removeLastUserMessage();
      if (lastMessage !== undefined) {
        inputMessage.value = lastMessage;
      }
    }

    session.resumeAfterStop();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.stopPropagation();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return {
    inputMessage,
    height,
    startResize,
    model,
    agentModels,
    isGenerating,
    hasProviderConfigured,
    canSend,
    handleSend,
    handleStop,
    handleKeydown,
  };
}
