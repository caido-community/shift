<script setup lang="ts">
import type { ShiftMessage } from "shared";
import { computed, ref } from "vue";

import { useUserMessage } from "./useMessage";

import { Confirmation } from "@/components/common/Confirmation";

const { message } = defineProps<{
  message: ShiftMessage & { role: "user" };
}>();

const { editMessage, revertToSnapshot, hasSnapshot, isGenerating } = useUserMessage();

const canRevert = computed(() => hasSnapshot(message.id) && !isGenerating.value);
const showRevertDialog = ref(false);

function handleDoubleClick() {
  if (isGenerating.value) {
    return;
  }
  editMessage(message);
}

function handleRevert() {
  if (!canRevert.value) {
    return;
  }
  showRevertDialog.value = true;
}

function handleRevertConfirm() {
  revertToSnapshot(message.id);
}
</script>

<template>
  <div
    class="group relative p-3 rounded-lg bg-surface-900 border border-surface-700 transition-colors duration-100 select-text"
    :class="{ 'cursor-pointer hover:border-surface-500': !isGenerating }"
    @dblclick="handleDoubleClick">
    <button
      v-if="canRevert"
      type="button"
      class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-all duration-150 rounded"
      title="Revert to this point"
      @click.stop="handleRevert">
      <i class="fas fa-undo text-xs" />
    </button>
    <div
      v-for="(part, index) in message.parts"
      :key="index"
      class="text-surface-200 font-mono"
      :class="{ 'opacity-80': isGenerating }">
      <span v-if="part && part.type === 'text'">{{ part?.text ?? "" }}</span>
    </div>
  </div>
  <Confirmation
    v-model:visible="showRevertDialog"
    title="Restore Request State"
    message="This will restore the HTTP request to its state when this message was sent. All subsequent chat messages will be lost."
    @confirm="handleRevertConfirm" />
</template>
