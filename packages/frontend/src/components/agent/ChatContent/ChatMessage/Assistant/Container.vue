<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import { getToolName, isToolUIPart } from "ai";
import type { ShiftMessage } from "shared";
import { computed } from "vue";

import { Markdown } from "./Markdown";
import { ChatMessageReasoning } from "./Reasoning";
import { ChatMessageTool } from "./Tool";
import { useAssistantMessage } from "./useAssistantMessage";

import { getToolErrorText } from "@/agent/utils/tools";
import { TextShimmer } from "@/components/common/TextShimmer";
import { useAnimatedDots } from "@/utils";

const { message } = defineProps<{
  message: ShiftMessage & { role: "assistant" };
}>();

const { processedParts, metadata, calculateReasoningTime, getReasoningIndex } = useAssistantMessage(
  () => message
);

const isWaitingForNextPart = computed(() => {
  if (metadata.value?.state !== "streaming") return false;
  if (processedParts.value.length === 0) return false;

  return processedParts.value.every((processed) => {
    const part = processed.part;
    if (part.type === "text") return part.state !== "streaming";
    if (part.type === "reasoning") return part.state === "done";
    if (isToolUIPart(part)) return part.state === "output-available";
    return true;
  });
});

const processingText = useAnimatedDots("Processing", isWaitingForNextPart);

const { copy, copied } = useClipboard();
const text = computed(() =>
  message.parts
    .flatMap((part) => (part.type === "text" ? [part.text.trim()] : []))
    .filter((partText) => partText !== "")
    .join("\n\n")
);
const canCopy = computed(() => metadata.value?.state !== "streaming" && text.value !== "");
</script>

<template>
  <div
    v-if="processedParts.length > 0"
    class="group/message animate-fade-in text-red-400 px-2.5 font-mono flex flex-col gap-1.5">
    <template
      v-for="(processed, index) in processedParts"
      :key="processed.index">
      <Markdown
        v-if="processed.part.type === 'text'"
        :text="processed.part.text.trim()"
        class="text-white animate-fade-in" />

      <ChatMessageReasoning
        v-else-if="processed.part.type === 'reasoning'"
        :text="processed.part.text.trim()"
        :part-state="processed.part.state"
        :message-state="metadata?.state"
        :reasoning-time="calculateReasoningTime(getReasoningIndex(index))" />

      <ChatMessageTool
        v-else-if="isToolUIPart(processed.part)"
        :tool-name="getToolName(processed.part)"
        :tool-call-id="processed.part.toolCallId"
        :part-state="processed.part.state"
        :message-metadata="metadata"
        :input="processed.part.input"
        :output="processed.part.output"
        :error-text="getToolErrorText(processed.part)" />

      <div
        v-else-if="processed.part.type === 'data-compaction'"
        class="text-sm text-surface-400 select-none"
        :title="processed.part.data.summary">
        Context compacted, continuing from a summary
      </div>

      <div v-else>Unknown part: {{ processed.part.type }}</div>
    </template>

    <TextShimmer
      v-if="isWaitingForNextPart"
      class="font-mono select-none text-surface-300 text-sm animate-fade-in w-fit"
      >{{ processingText }}</TextShimmer
    >

    <button
      v-if="canCopy"
      type="button"
      class="self-start -ml-1 px-1 text-xs text-surface-500 hover:text-surface-300 opacity-0 group-hover/message:opacity-100 transition-all duration-150 select-none"
      title="Copy message"
      @click="copy(text)">
      <i :class="copied ? 'fas fa-check' : 'fas fa-copy'" />
    </button>
  </div>
</template>
