import { defineStore } from "pinia";
import {
  createModelKey,
  defaultSettingsConfig,
  type FeatureFlagKey,
  type Model,
  type SettingsConfig,
  type UpdateSettingsInput,
} from "shared";
import { computed, ref } from "vue";

import { useSDK } from "@/plugins/sdk";

export const useSettingsStore = defineStore("settings", () => {
  const sdk = useSDK();
  const loaded = ref<SettingsConfig>();

  const config = computed(() => loaded.value ?? defaultSettingsConfig);
  const isLoaded = computed(() => loaded.value !== undefined);

  async function initialize() {
    const result = await sdk.backend.getSettings();
    if (result.kind === "Ok") loaded.value = result.value;
  }

  async function update(input: UpdateSettingsInput) {
    const result = await sdk.backend.updateSettings(input);
    if (result.kind === "Error") {
      sdk.window.showToast(`[Shift] Failed to save settings: ${result.error}`, {
        variant: "error",
      });
      return;
    }
    loaded.value = result.value;
  }

  const getModelPreference = (selected: Model) =>
    config.value.modelPreferences[createModelKey(selected.provider, selected.id)];
  const isFastModeEnabled = (selected: Model) => getModelPreference(selected)?.fastMode ?? false;
  const isUltrafastEnabled = (selected: Model) => getModelPreference(selected)?.ultrafast ?? false;
  const getRequestOptions = (selected: Model) => ({
    openRouterPrioritizeFastProviders: config.value.openRouterPrioritizeFastProviders,
    fastMode: isFastModeEnabled(selected),
    ultrafast: isUltrafastEnabled(selected),
    daybreak: config.value.daybreak,
  });

  const isFeatureEnabled = (flag: FeatureFlagKey) => config.value.featureFlags[flag];

  return {
    config,
    isLoaded,
    initialize,
    update,
    isFastModeEnabled,
    isUltrafastEnabled,
    getRequestOptions,
    isFeatureEnabled,
  };
});
