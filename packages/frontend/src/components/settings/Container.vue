<script setup lang="ts">
import Card from "primevue/card";
import InputNumber from "primevue/inputnumber";
import ToggleSwitch from "primevue/toggleswitch";
import { computed } from "vue";

import { useSettingsStore } from "@/stores/settings";
import { updateSettings } from "@/stores/settings/store.effects";

const settingsStore = useSettingsStore();
const { sdk, dispatch } = settingsStore;

const maxIterations = computed({
  get() {
    return settingsStore.maxIterations ?? 35;
  },
  set(value: number) {
    updateSettings(sdk, dispatch, { maxIterations: value });
  },
});

const debugToolsEnabled = computed({
  get() {
    return settingsStore.debugToolsEnabled ?? false;
  },
  set(value: boolean) {
    updateSettings(sdk, dispatch, { debugToolsEnabled: value });
  },
});

const autoCreateShiftCollection = computed({
  get() {
    return settingsStore.autoCreateShiftCollection ?? true;
  },
  set(value: boolean) {
    updateSettings(sdk, dispatch, { autoCreateShiftCollection: value });
  },
});

const openRouterPrioritizeFastProviders = computed({
  get() {
    return settingsStore.openRouterPrioritizeFastProviders ?? false;
  },
  set(value: boolean) {
    updateSettings(sdk, dispatch, { openRouterPrioritizeFastProviders: value });
  },
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
            <h2 class="text-base font-bold">Settings</h2>
            <p class="text-sm text-surface-400">Configure global preferences for Shift.</p>
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
              <label class="text-base font-medium">Max Iterations</label>
              <p class="text-sm text-surface-400">
                Enter the maximum number of iterations for AI model.
              </p>
            </div>

            <InputNumber
              v-model="maxIterations"
              placeholder="Enter max iterations"
              class="w-full" />
          </div>

          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col">
              <label class="text-base font-medium">Enable Debug Tools</label>
              <p class="text-sm text-surface-400">Show debug controls.</p>
            </div>

            <ToggleSwitch v-model="debugToolsEnabled" />
          </div>

          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col">
              <label class="text-base font-medium">Auto-create Shift Collection</label>
              <p class="text-sm text-surface-400">
                Automatically create a 'Shift' replay collection and show agent dialog for new
                sessions.
              </p>
            </div>

            <ToggleSwitch v-model="autoCreateShiftCollection" />
          </div>

          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col">
              <label class="text-base font-medium">OpenRouter: Prioritize fast providers</label>
              <p class="text-sm text-surface-400">
                Use the Nitro routing variant (throughput-first). May increase cost.
              </p>
            </div>

            <ToggleSwitch v-model="openRouterPrioritizeFastProviders" />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
