<script setup lang="ts">
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Textarea from "primevue/textarea";
import { computed } from "vue";

import { ModelSelector, useModelSetting } from "@/components/agent/ChatInput/ModelSelector";
import { useSettingsStore } from "@/stores/settings";

const settingsStore = useSettingsStore();
const { models, model } = useModelSetting("renamingModel", "float");

const enabled = computed({
  get: () => settingsStore.config.renaming.enabled,
  set: (value: boolean) => void settingsStore.update({ renaming: { enabled: value } }),
});

const renameAfterSend = computed({
  get: () => settingsStore.config.renaming.renameAfterSend,
  set: (value: boolean) => void settingsStore.update({ renaming: { renameAfterSend: value } }),
});

const instructions = computed({
  get: () => settingsStore.config.renaming.instructions,
  set: (value: string) => void settingsStore.update({ renaming: { instructions: value } }),
});
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
                v-model="model"
                :models="models"
                size="small"
                :disabled="!enabled" />
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
