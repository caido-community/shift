<script setup lang="ts">
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import InputNumber from "primevue/inputnumber";
import ToggleSwitch from "primevue/toggleswitch";
import { defaultFeatureFlags, type FeatureFlagKey } from "shared";
import { computed } from "vue";

import { featureFlagEntries } from "@/features";
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

const experimentalFeatureFlags = featureFlagEntries.filter(
  (flag) => flag.category === "experimental"
);

const getFeatureFlagValue = (flag: FeatureFlagKey): boolean => {
  return settingsStore.featureFlags?.[flag] ?? defaultFeatureFlags[flag];
};

const updateFeatureFlag = (flag: FeatureFlagKey, value: boolean) => {
  updateSettings(sdk, dispatch, {
    featureFlags: { [flag]: value },
  });
};
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

          <div class="flex flex-col gap-3">
            <div class="flex flex-col">
              <label class="text-base font-medium">Feature Flags</label>
              <p class="text-sm text-surface-400">
                Enable optional and experimental capabilities for Shift.
              </p>
            </div>

            <div
              v-for="flag in experimentalFeatureFlags"
              :key="flag.key"
              class="flex items-start gap-3 rounded-lg border border-surface-700/60 p-3">
              <Checkbox
                :model-value="getFeatureFlagValue(flag.key)"
                binary
                class="mt-0.5"
                @update:model-value="updateFeatureFlag(flag.key, $event)" />

              <div class="flex flex-col">
                <label class="text-sm font-medium">{{ flag.label }}</label>
                <p class="text-sm text-surface-400">{{ flag.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
