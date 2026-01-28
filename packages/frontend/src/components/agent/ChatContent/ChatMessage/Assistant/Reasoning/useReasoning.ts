import type { ReasoningUIPart } from "ai";
import type { MessageState } from "shared";
import { computed, type MaybeRefOrGetter, ref, toValue, watch } from "vue";

import { useAnimatedDots } from "@/utils";

type DisplayState = "streaming" | "done" | "aborted" | "error" | "invalid";

export const useReasoning = (args: {
  text: MaybeRefOrGetter<string>;
  partState: MaybeRefOrGetter<ReasoningUIPart["state"]>;
  messageState: MaybeRefOrGetter<MessageState | undefined>;
  reasoningTime: MaybeRefOrGetter<string | undefined>;
}) => {
  const showReasoning = ref(false);

  const displayState = computed<DisplayState>(() => {
    const partState = toValue(args.partState);
    const messageState = toValue(args.messageState);

    if (partState === "done") return "done";
    if (partState === "streaming") {
      if (messageState === "streaming") return "streaming";
      if (messageState === "done") return "done";
      if (messageState === "aborted") return "aborted";
      if (messageState === "error") return "error";
    }
    return "invalid";
  });

  const isStreaming = computed(() => displayState.value === "streaming");
  const isDone = computed(() => displayState.value === "done");

  const hasContent = computed(() => {
    const text = toValue(args.text);
    return text.length > 0 && text !== "[REDACTED]";
  });

  const thinkingText = useAnimatedDots("Thinking", isStreaming);

  const reasoningLabel = computed(() => {
    const state = displayState.value;
    if (state === "streaming") return thinkingText.value;
    if (state === "aborted") return "Thinking cancelled";
    if (state === "error") return "Thinking failed";
    if (state === "done") return "Thought";
    return "Invalid state";
  });

  const reasoningDuration = computed(() => {
    if (!isDone.value) return undefined;
    return toValue(args.reasoningTime) ?? "a few seconds";
  });

  const toggleReasoning = () => {
    showReasoning.value = !showReasoning.value;
  };

  watch(
    () => toValue(args.messageState),
    (newState) => {
      if (newState !== "streaming") {
        showReasoning.value = false;
      }
    },
    { immediate: true }
  );

  return {
    showReasoning,
    toggleReasoning,
    isStreaming,
    hasContent,
    reasoningLabel,
    reasoningDuration,
  };
};
