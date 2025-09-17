<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";
import { useFloatStore } from "@/stores/float";

const store = useFloatStore();
const { streamState, canSendMessage } = storeToRefs(store);
const { runQuery } = store;
</script>

<template>
  <div class="w-full h-5 flex items-center justify-between">
    <ModelSelector variant="float" />

    <div class="flex items-center">
      <Button
        v-if="streamState === 'Idle'"
        severity="tertiary"
        icon="fas fa-arrow-circle-up"
        class="hover:text-surface-200"
        :disabled="!canSendMessage"
        :pt="{
          root: {
            style: {
              width: 'fit-content',
              padding: '0 0.05rem',
              opacity: canSendMessage ? '1' : '0.5',
            },
          },
        }"
        @mousedown.stop
        @click="runQuery"
      />
      <Button
        v-else-if="streamState === 'Streaming'"
        severity="tertiary"
        icon="fas fa-spinner fa-spin"
        :disabled="true"
        :pt="{
          root: {
            style: {
              width: 'fit-content',
              padding: '0 0.05rem',
              opacity: '0.5',
            },
          },
        }"
        @mousedown.stop
      />
    </div>
  </div>
</template>
