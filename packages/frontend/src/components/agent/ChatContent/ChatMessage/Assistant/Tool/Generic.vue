<script setup lang="ts">
import type { MessageMetadata, PartState, RequestDiff } from "shared";
import { computed, toRef } from "vue";

import { getToolMessages } from "./messages";
import RequestDiffView from "./RequestDiff.vue";
import { useTool } from "./useTool";

import { type MessageResult } from "@/agent/types";
import { formatToolDisplayText } from "@/agent/utils/formatting";
import { useDetailToggle } from "@/components/agent/useDetailToggle";
import { useSession } from "@/components/agent/useSession";
import { TextShimmer } from "@/components/common/TextShimmer";
import { useSDK } from "@/plugins/sdk";

const { toolName, input, partState, messageMetadata, output, errorText, requestDiff } =
  defineProps<{
    toolName: string;
    partState: PartState;
    messageMetadata: MessageMetadata | undefined;
    input: unknown;
    output: unknown;
    errorText: string | undefined;
    requestDiff: RequestDiff | undefined;
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

const defaultParts = (text: string): MessageResult => [
  { text: `${text} ` },
  { text: toolName, muted: true },
];

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

const sdk = useSDK();
const session = useSession();

const entryId = computed(() => {
  const value = extractedOutput.value as { entryId?: unknown } | undefined;
  return typeof value?.entryId === "string" ? value.entryId : undefined;
});

const { isOpen: showDiff, toggle: toggleDiff } = useDetailToggle();
const isClickable = computed(() => requestDiff !== undefined || entryId.value !== undefined);

const handleClick = () => {
  if (requestDiff !== undefined) {
    toggleDiff();
    return;
  }
  if (entryId.value === undefined) return;
  sdk.replay.showEntry(session.id, entryId.value).catch(() => {
    sdk.window.showToast("This Replay entry no longer exists", { variant: "error" });
  });
};
</script>

<template>
  <div class="text-sm animate-fade-in min-w-0">
    <component
      :is="isClickable ? 'button' : 'div'"
      class="flex items-center h-5 text-surface-300 min-w-0"
      :class="{
        'group/entry cursor-pointer hover:!text-surface-100 transition-colors': isClickable,
      }"
      :title="entryId !== undefined ? 'Open this entry in Replay' : undefined"
      :aria-expanded="requestDiff !== undefined ? showDiff : undefined"
      @click="handleClick">
      <template v-if="toolState === 'streaming'">
        <span class="min-w-0 truncate">
          <TextShimmer>
            <template
              v-for="(part, index) in streamingResult"
              :key="index">
              <span :class="{ 'text-surface-500': part.muted }">
                {{ formatToolDisplayText(part.text) }}
              </span>
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
              <span :class="{ 'text-surface-500': part.muted }">
                {{ formatToolDisplayText(part.text) }}
              </span>
            </template>
          </TextShimmer>
        </span>
      </template>

      <template v-else-if="toolState === 'success'">
        <span class="min-w-0 truncate">
          <template
            v-for="(part, index) in successResult"
            :key="index">
            <span
              :class="{
                'text-surface-500 group-hover/entry:!text-surface-200 transition-colors':
                  part.muted,
              }">
              {{ formatToolDisplayText(part.text) }}
            </span>
          </template>
        </span>
        <i
          v-if="requestDiff !== undefined"
          class="fas fa-chevron-right shrink-0 text-[10px] text-surface-500 transition-all duration-150 ease-in-out ml-1.5"
          :class="[
            showDiff ? 'rotate-90 opacity-100' : 'opacity-0 group-hover/entry:!opacity-100',
          ]" />
      </template>

      <template v-else>
        <span class="text-surface-500 min-w-0 truncate">{{ errorMessage }}</span>
      </template>
    </component>

    <RequestDiffView
      v-if="showDiff && requestDiff !== undefined"
      :diff="requestDiff"
      class="mt-1 mb-1.5" />
  </div>
</template>
