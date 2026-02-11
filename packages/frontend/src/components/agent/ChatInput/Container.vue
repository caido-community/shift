<script setup lang="ts">
import Button from "primevue/button";

import { AgentSelector } from "./AgentSelector";
import { ModelSelector } from "./ModelSelector";
import { ModeSelector } from "./ModeSelector";
import { useChatInput } from "./useChatInput";

const {
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
} = useChatInput();
</script>

<template>
  <div
    class="bg-surface-900 flex flex-col border-t border-surface-700"
    :style="{ height: `${height}px` }">
    <div
      class="h-2 cursor-ns-resize flex items-center justify-center group shrink-0 transition-colors"
      @mousedown="startResize">
      <div
        class="w-12 h-1 rounded-full bg-surface-600 group-hover:bg-surface-400 transition-colors" />
    </div>

    <div class="flex flex-col gap-4 p-3 pt-2 flex-1 min-h-0">
      <textarea
        ref="textarea"
        v-model="inputMessage"
        placeholder="Message the Shift agent"
        :disabled="!hasProviderConfigured"
        :class="{
          'opacity-60': isGenerating || !hasProviderConfigured,
          'text-surface-200': !isGenerating && hasProviderConfigured,
          'text-surface-400': isGenerating || !hasProviderConfigured,
          'cursor-not-allowed': !hasProviderConfigured,
        }"
        class="border-0 outline-none font-mono resize-none bg-transparent flex-1 text-base focus:outline-none focus:ring-0 overflow-y-auto scrollbar-hide"
        style="scrollbar-width: none; -ms-overflow-style: none"
        spellcheck="false"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        @keydown="handleKeydown" />

      <div class="flex items-center justify-between min-w-0">
        <div class="flex items-center gap-2 shrink-0">
          <ModelSelector
            v-model="model"
            v-model:reasoning-effort="reasoningEffort"
            :models="agentModels"
            reasoning-mode="variant"
            :disabled="isGenerating || !hasProviderConfigured" />
          <ModeSelector />
          <AgentSelector />
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <Button
            v-if="!isGenerating"
            severity="tertiary"
            icon="fas fa-arrow-circle-up"
            :disabled="!canSend"
            :pt:root="{
              class: canSend
                ? 'bg-surface-700/50 text-surface-200 text-sm py-1.5 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 h-8 w-8 cursor-pointer shrink-0'
                : 'bg-surface-700/20 text-surface-400 text-sm py-1.5 px-2 flex items-center justify-center rounded-md h-8 w-8 cursor-not-allowed shrink-0',
            }"
            @click="handleSend" />
          <Button
            v-else
            severity="danger"
            icon="fas fa-square"
            :pt:root="{
              class:
                'bg-red-400/10 text-red-400 py-1 px-1.5 flex items-center justify-center rounded-md hover:bg-red-400/20 transition-colors duration-200 h-8 w-8 cursor-pointer shrink-0',
            }"
            :pt:icon="{ class: 'text-sm' }"
            @click="handleStop" />
        </div>
      </div>
    </div>
  </div>
</template>
