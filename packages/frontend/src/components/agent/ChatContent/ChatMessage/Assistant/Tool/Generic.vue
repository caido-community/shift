<script setup lang="ts">
import type { MessageMetadata, PartState } from "shared";
import { computed, toRef } from "vue";

import { getToolMessages } from "./messages";
import { useTool } from "./useTool";

import { type MessageResult } from "@/agent/types";
import { TextShimmer } from "@/components/common/TextShimmer";

const { toolName, input, partState, messageMetadata, output, errorText } = defineProps<{
  toolName: string;
  partState: PartState;
  messageMetadata: MessageMetadata | undefined;
  input: unknown;
  output: unknown;
  errorText: string | undefined;
}>();

const defaultErrorMessage = errorText ?? `Failed to call ${toolName}`;

const { toolState, extractedOutput, errorMessage } = useTool(
  {
    partState: toRef(() => partState),
    messageMetadata: toRef(() => messageMetadata),
    output: toRef(() => output),
  },
  defaultErrorMessage
);

const messages = computed(() => getToolMessages(toolName));

const defaultParts = (text: string): MessageResult => [{ text }, { text: toolName, muted: true }];

const displayContext = computed(() => ({ input, output: extractedOutput.value }));

const streamingResult = computed(
  () => messages.value?.streaming(displayContext.value) ?? defaultParts("Calling")
);
const pendingResult = computed(
  () => messages.value?.streaming(displayContext.value) ?? defaultParts("Running")
);
const successResult = computed(
  () => messages.value?.success(displayContext.value) ?? defaultParts("Called")
);
</script>

<template>
  <div class="flex items-center h-5 text-surface-300 text-sm animate-fade-in min-w-0">
    <template v-if="toolState === 'streaming'">
      <span class="min-w-0 truncate">
        <TextShimmer>
          <template
            v-for="(part, index) in streamingResult"
            :key="index">
            <span :class="{ 'text-surface-500': part.muted }">{{ part.text }}</span>
          </template>
        </TextShimmer>
      </span>
    </template>

    <template v-else-if="toolState === 'pending'">
      <span class="min-w-0 truncate">
        <TextShimmer>
          <template
            v-for="(part, index) in pendingResult"
            :key="index">
            <span :class="{ 'text-surface-500': part.muted }">{{ part.text }}</span>
          </template>
        </TextShimmer>
      </span>
    </template>

    <template v-else-if="toolState === 'success'">
      <span class="min-w-0 truncate">
        <template
          v-for="(part, index) in successResult"
          :key="index">
          <span :class="{ 'text-surface-500': part.muted }">{{ part.text }}</span>
        </template>
      </span>
    </template>

    <template v-else>
      <span class="text-surface-500 min-w-0 truncate">{{ errorMessage }}</span>
    </template>
  </div>
</template>
