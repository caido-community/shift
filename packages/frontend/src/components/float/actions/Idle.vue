<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";

import { ModelSelector, useModelSetting } from "@/components/agent/ChatInput/ModelSelector";
import { useFloatStore } from "@/stores/float";

const floatStore = useFloatStore();
const { canSendMessage } = storeToRefs(floatStore);
const { models, model } = useModelSetting("floatModel", "float");
</script>

<template>
  <div class="w-full h-5 flex items-center justify-between">
    <ModelSelector
      v-model="model"
      :models="models"
      size="small" />

    <Button
      severity="tertiary"
      icon="fas fa-arrow-circle-up"
      class="hover:text-white"
      :disabled="!canSendMessage"
      :pt:root="{
        style: {
          width: 'fit-content',
          padding: '0 0.05rem',
          opacity: canSendMessage ? '1' : '0.5',
        },
      }"
      @mousedown.stop
      @click="floatStore.runQuery" />
  </div>
</template>
