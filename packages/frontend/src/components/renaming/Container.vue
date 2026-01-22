<script setup lang="ts">
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Textarea from "primevue/textarea";
import { createModelKey, type Model } from "shared";
import { computed, watch } from "vue";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";
import { useSDK } from "@/plugins/sdk";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { updateRenaming, updateSettings } from "@/stores/settings/store.effects";
import { resolveModel } from "@/utils/ai";

const sdk = useSDK();
const modelsStore = useModelsStore();
const settingsStore = useSettingsStore();
const { dispatch } = settingsStore;

const enabled = computed({
  get() {
    return settingsStore.renaming?.enabled ?? false;
  },
  set(value: boolean) {
    updateRenaming(sdk, dispatch, { enabled: value });
  },
});

const renameAfterSend = computed({
  get() {
    return settingsStore.renaming?.renameAfterSend ?? false;
  },
  set(value: boolean) {
    updateRenaming(sdk, dispatch, { renameAfterSend: value });
  },
});

const instructions = computed({
  get() {
    return settingsStore.renaming?.instructions ?? "";
  },
  set(value: string) {
    updateRenaming(sdk, dispatch, { instructions: value });
  },
});

const allModels = computed(() => modelsStore.getEnabledModels({}));

const selectedModel = computed(() => {
  const key = settingsStore.renamingModel;
  if (key === undefined) return undefined;
  return allModels.value.find((m) => createModelKey(m.provider, m.id) === key);
});

const resolvedModel = computed(() =>
  resolveModel({
    sdk,
    savedModelKey: settingsStore.renamingModel,
    enabledModels: allModels.value,
    usageType: "float",
  })
);

const handleModelUpdate = (model: Model | undefined) => {
  if (model === undefined) return;
  const key = createModelKey(model.provider, model.id);
  updateSettings(sdk, dispatch, { renamingModel: key });
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
  <div class="flex flex-col h-full gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold">Session Renaming</h2>
            <p class="text-sm text-surface-400">Automatically name replay tabs using AI.</p>
          </div>
        </div>
      </template>
    </Card>

    <Card
      class="h-full min-h-0"
      :pt:body="{ class: 'h-full p-0' }"
      :pt:content="{ class: 'h-full overflow-hidden' }">
      <template #content>
        <div class="p-4 flex flex-col gap-6 overflow-y-auto h-full">
          <div class="flex flex-col gap-2">
            <div class="flex flex-col">
              <label class="text-base font-medium">Enable Session Renaming</label>
              <p class="text-sm text-surface-400">Automatically name replay tabs using AI.</p>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="enabled"
                binary />
              <span class="text-sm">Enabled</span>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex flex-col">
              <label class="text-base font-medium">Rename again after sending</label>
              <p class="text-sm text-surface-400">
                Trigger a second rename when the session is sent in case the request was edited.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Checkbox
                v-model="renameAfterSend"
                :disabled="!enabled"
                binary />
              <span class="text-sm">Also rename after sending the session</span>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex flex-col">
              <label class="text-base font-medium">Explain format in natural language</label>
              <p class="text-sm text-surface-400">
                Provide guidelines for how tabs should be named.
              </p>
            </div>
            <Textarea
              v-model="instructions"
              :disabled="!enabled"
              rows="8"
              class="w-full"
              placeholder="Provide custom instructions for how tabs should be renamed..." />
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex flex-col">
              <label class="text-base font-medium">Model for Renaming</label>
              <p class="text-sm text-surface-400">
                Select which model to use for session tab names. We recommend using a cheap, small
                model as this will be called frequently.
              </p>
            </div>
            <div class="w-full max-w-md py-2">
              <ModelSelector
                :model-value="selectedModel"
                :models="allModels"
                size="small"
                :disabled="!enabled"
                @update:model-value="handleModelUpdate" />
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
