import { useFocus } from "@vueuse/core";
import { type Model } from "shared";
import { computed, onBeforeUnmount, ref, toRef, useTemplateRef, watch } from "vue";

import { useSession } from "../useSession";

import { useModelSetting } from "./ModelSelector/useModelSetting";
import { useResize } from "./useResize";

import { useModelsStore } from "@/stores/models";

export function useChatInput() {
  const modelsStore = useModelsStore();
  const { models: agentModels, model: savedModel } = useModelSetting("agentsModel", "agent");
  const textarea = useTemplateRef<HTMLTextAreaElement>("textarea");
  const session = useSession();
  const draftMessage = toRef(session.store, "draftMessage");
  const inputMessage = ref(draftMessage.value ?? "");

  onBeforeUnmount(() => {
    if (inputMessage.value.trim() !== "") {
      session.store.setDraftMessage(inputMessage.value);
    }
  });

  const { height, startResize } = useResize();

  const { focused } = useFocus(textarea, { initialValue: true });

  watch(
    draftMessage,
    (draft) => {
      if (draft !== "") {
        inputMessage.value = draft;
        session.store.setDraftMessage("");
        focused.value = true;
      }
    },
    { immediate: true }
  );

  const model = computed({
    get: () => session.store.model,
    set: (value: Model | undefined) => {
      session.store.setModel(value);
      savedModel.value = value;
    },
  });

  watch(
    [savedModel, model],
    ([resolved, current]) => {
      if (current === undefined && resolved !== undefined) {
        session.store.setModel(resolved);
      }
    },
    { immediate: true }
  );
  const isGenerating = computed(() => session.isGenerating());
  const hasProviderConfigured = computed(() => modelsStore.hasProvider);
  const reasoningEffort = computed({
    get: () => session.store.reasoningEffort,
    set: (value) => session.store.setReasoningEffort(value),
  });
  const hasMessage = computed(() => inputMessage.value.trim() !== "");
  const canSend = computed(
    () => hasMessage.value && hasProviderConfigured.value && model.value !== undefined
  );

  function handleSend() {
    if (!canSend.value) return;

    const message = inputMessage.value.trim();
    inputMessage.value = "";

    session.send(message);
  }

  async function handleStop() {
    const withdrawnText = await session.stop();
    if (withdrawnText !== undefined) {
      inputMessage.value = withdrawnText;
    }
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
    reasoningEffort,
    canSend,
    handleSend,
    handleStop,
    handleKeydown,
  };
}
