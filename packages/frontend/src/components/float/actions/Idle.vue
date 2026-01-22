<script setup lang="ts">
import { storeToRefs } from "pinia";
import Button from "primevue/button";
import { createModelKey, type Model } from "shared";
import { computed, watch } from "vue";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";
import { useSDK } from "@/plugins/sdk";
import { useFloatStore } from "@/stores/float";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { updateSettings } from "@/stores/settings/store.effects";
import { resolveModel } from "@/utils/ai";

const sdk = useSDK();
const floatStore = useFloatStore();
const modelsStore = useModelsStore();
const settingsStore = useSettingsStore();

const { canSendMessage } = storeToRefs(floatStore);

const floatModels = computed(() => modelsStore.getEnabledModels({ usageType: "float" }));

const selectedModel = computed(() => {
  const key = settingsStore.floatModel;
  if (key === undefined) return undefined;
  return floatModels.value.find((m) => createModelKey(m.provider, m.id) === key);
});

const resolvedModel = computed(() =>
  resolveModel({
    sdk,
    savedModelKey: settingsStore.floatModel,
    enabledModels: floatModels.value,
    usageType: "float",
  })
);

const handleModelUpdate = (model: Model | undefined) => {
  if (model === undefined) return;
  const key = createModelKey(model.provider, model.id);
  updateSettings(settingsStore.sdk, settingsStore.dispatch, { floatModel: key });
};

watch(
  [resolvedModel, selectedModel],
  ([resolved, current]) => {
    if (current === undefined && resolved !== undefined) {
      handleModelUpdate(resolved);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="w-full h-5 flex items-center justify-between">
    <ModelSelector
      :model-value="selectedModel"
      :models="floatModels"
      size="small"
      @update:model-value="handleModelUpdate" />

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
