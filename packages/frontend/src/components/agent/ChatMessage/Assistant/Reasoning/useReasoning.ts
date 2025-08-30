import { computed, ref, type Ref, watch } from "vue";

import type { MessageState } from "@/agents/types";

export const useReasoning = (args: {
  content: Ref<string>;
  state: Ref<"streaming" | "done" | undefined>;
  messageState: Ref<MessageState | undefined>;
  contentContainer: Ref<HTMLElement | undefined>;
}) => {
  const showReasoning = ref(false);

  const toggleReasoning = () => {
    showReasoning.value = !showReasoning.value;
  };

  const isReasoning = computed(
    () =>
      args.messageState.value === "streaming" &&
      args.state.value === "streaming",
  );

  const reasoningText = computed(() => {
    if (isReasoning.value) return "Thinking...";
    return "Thought for a few seconds";
  });

  const hasContent = computed(
    () => args.content.value !== undefined && args.content.value.length > 0,
  );

  watch(
    () => args.messageState.value,
    (newState) => {
      if (newState !== "streaming") {
        showReasoning.value = false;
      }
    },
    { immediate: true },
  );

  return {
    showReasoning,
    toggleReasoning,
    isReasoning,
    reasoningText,
    hasContent,
  };
};
