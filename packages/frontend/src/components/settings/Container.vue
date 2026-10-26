<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import InputNumber from "primevue/inputnumber";
import SelectButton from "primevue/selectbutton";
import ToggleSwitch from "primevue/toggleswitch";
import { type ChatAppearance, featureFlagEntries } from "shared";
import { computed } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useSettingsStore } from "@/stores/settings";

const sdk = useSDK();
const settingsStore = useSettingsStore();

const maxIterations = computed({
  get: () => settingsStore.config.maxIterations,
  set: (value: number) => void settingsStore.update({ maxIterations: value }),
});

const chatAppearance = computed({
  get: () => settingsStore.config.chatAppearance,
  set: (value: ChatAppearance) => void settingsStore.update({ chatAppearance: value }),
});

const debugToolsEnabled = computed({
  get: () => settingsStore.config.debugToolsEnabled,
  set: (value: boolean) => void settingsStore.update({ debugToolsEnabled: value }),
});

const autoCreateShiftCollection = computed({
  get: () => settingsStore.config.autoCreateShiftCollection,
  set: (value: boolean) => void settingsStore.update({ autoCreateShiftCollection: value }),
});

const openRouterPrioritizeFastProviders = computed({
  get: () => settingsStore.config.openRouterPrioritizeFastProviders,
  set: (value: boolean) => void settingsStore.update({ openRouterPrioritizeFastProviders: value }),
});

const chatAppearanceOptions: { label: string; value: ChatAppearance }[] = [
  { label: "Compact", value: "compact" },
  { label: "Expanded", value: "expanded" },
];
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
            <p class="text-sm text-surface-400">
              Configure global preferences for Shift. Providers and API keys live in Caido settings,
              under AI.
            </p>
          </div>
          <Button
            label="Set API keys"
            icon="fas fa-key"
            size="small"
            severity="secondary"
            class="shrink-0"
            @click="sdk.navigation.goTo('/settings')" />
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
              <label class="text-base font-medium">Chat Appearance</label>
              <p class="text-sm text-surface-400">
                Compact keeps request diffs and command output collapsed until you click them.
                Expanded opens them by default.
              </p>
            </div>

            <SelectButton
              v-model="chatAppearance"
              :options="chatAppearanceOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              class="shrink-0" />
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
              v-for="flag in featureFlagEntries"
              :key="flag.key"
              class="flex items-start gap-3 rounded-lg border border-surface-700/60 p-3">
              <Checkbox
                :model-value="settingsStore.isFeatureEnabled(flag.key)"
                binary
                class="mt-0.5"
                @update:model-value="
                  settingsStore.update({ featureFlags: { [flag.key]: $event } })
                " />

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
