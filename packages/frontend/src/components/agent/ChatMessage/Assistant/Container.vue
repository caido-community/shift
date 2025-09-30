<script setup lang="ts">
import { getToolName, isToolUIPart } from "ai";
import { computed, toRefs } from "vue";

import { ChatMessageTool } from "../Tool";

import { Markdown } from "./Markdown";
import { Reasoning } from "./Reasoning";

import { type CustomUIMessage } from "@/agents/types";
import { useAgentsStore } from "@/stores/agents";

const props = defineProps<{
  message: CustomUIMessage & { role: "assistant" };
}>();

const { message } = toRefs(props);
const agentsStore = useAgentsStore();

const noContentYet = computed(() => {
  if (message.value.metadata?.state !== "streaming") {
    return false;
  }

  if (message.value.parts.length === 0) {
    return true;
  }

  const hasNonStepStartContent = message.value.parts.some(
    (part) => part.type !== "step-start",
  );

  if (!hasNonStepStartContent) {
    return true;
  }

  return false;
});

const isGenerating = computed(() => {
  return (
    message.value.metadata?.state === "streaming" &&
    agentsStore.selectedAgent?.status === "streaming"
  );
});

const isAborted = computed(() => {
  return message.value.metadata?.state === "abort";
});

const hasPendingStep = computed(() => {
  if (message.value.metadata?.state !== "streaming") {
    return false;
  }
  const parts = message.value.parts;
  return parts.length > 0 && parts[parts.length - 1]?.type === "step-start";
});
</script>

<template>
  <div class="px-3">
    <template v-if="!noContentYet">
      <template v-for="(part, index) in message.parts" :key="index">
        <template v-if="part && part.type === 'text'">
          <div class="text-surface-200">
            <Markdown :content="part?.text ?? ''" />
          </div>
        </template>
        <template v-else-if="part && part.type === 'reasoning'">
          <Reasoning
            :content="part?.text ?? ''"
            :state="part.state"
            :message-state="message.metadata?.state"
          />
        </template>
        <template v-else-if="part && isToolUIPart(part)">
          <ChatMessageTool
            :tool-name="getToolName(part)"
            :state="part.state"
            :output="part.output"
            :message-state="message.metadata?.state"
          />
        </template>
      </template>
      <div
        v-if="hasPendingStep"
        class="flex items-center text-surface-300 text-sm font-mono py-1"
      >
        <span :class="{ shimmer: true }">Planning...</span>
      </div>
    </template>
    <div v-else-if="isGenerating" class="px-2 py-2">
      <div class="flex items-center gap-1 text-surface-400">
        <div class="animate-pulse">•</div>
        <div class="animate-pulse" style="animation-delay: 0.2s">•</div>
        <div class="animate-pulse" style="animation-delay: 0.4s">•</div>
      </div>
    </div>
    <div v-if="isAborted" class="py-2 text-surface-400 opacity-50">Aborted</div>
  </div>
</template>
