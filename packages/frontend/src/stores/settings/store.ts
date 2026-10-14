import { defineStore } from "pinia";
import { createModelKey, type FeatureFlagKey, isFeatureFlagEnabled, type Model } from "shared";
import { computed, readonly, ref } from "vue";

import { fetchSettings } from "./store.effects";
import { initialModel, type SettingsMessage, type SettingsModel } from "./store.model";
import { update } from "./store.update";

import { useSDK } from "@/plugins/sdk";

export const useSettingsStore = defineStore("settings", () => {
  const sdk = useSDK();
  const model = ref<SettingsModel>(initialModel);

  function dispatch(message: SettingsMessage) {
    model.value = update(model.value, message);
  }

  const config = computed(() => model.value.config);
  const isLoading = computed(() => model.value.isLoading);
  const error = computed(() => model.value.error);

  const agentsModel = computed(() => model.value.config?.agentsModel);
  const floatModel = computed(() => model.value.config?.floatModel);
  const renamingModel = computed(() => model.value.config?.renamingModel);
  const maxIterations = computed(() => model.value.config?.maxIterations);
  const chatAppearance = computed(() => model.value.config?.chatAppearance ?? "compact");
  const renaming = computed(() => model.value.config?.renaming);
  const debugToolsEnabled = computed(() => model.value.config?.debugToolsEnabled);
  const autoCreateShiftCollection = computed(() => model.value.config?.autoCreateShiftCollection);
  const openRouterPrioritizeFastProviders = computed(
    () => model.value.config?.openRouterPrioritizeFastProviders
  );
  const featureFlags = computed(() => model.value.config?.featureFlags);
  const daybreak = computed(() => model.value.config?.daybreak ?? false);
  const getModelPreference = (selected: Model) =>
    model.value.config?.modelPreferences?.[createModelKey(selected.provider, selected.id)];
  const isFastModeEnabled = (selected: Model) => getModelPreference(selected)?.fastMode ?? false;
  const isUltrafastEnabled = (selected: Model) => getModelPreference(selected)?.ultrafast ?? false;
  const getRequestOptions = (selected: Model) => ({
    fastMode: isFastModeEnabled(selected),
    ultrafast: isUltrafastEnabled(selected),
    daybreak: daybreak.value,
  });
  const backgroundAgentsEnabled = computed(() =>
    isFeatureFlagEnabled(model.value.config?.featureFlags, "backgroundAgents")
  );

  async function initialize() {
    await fetchSettings(sdk, dispatch);
  }

  function isFeatureEnabled(flag: FeatureFlagKey): boolean {
    return isFeatureFlagEnabled(model.value.config?.featureFlags, flag);
  }

  return {
    state: readonly(model),
    sdk,
    dispatch,
    config,
    isLoading,
    error,
    agentsModel,
    floatModel,
    renamingModel,
    maxIterations,
    chatAppearance,
    renaming,
    debugToolsEnabled,
    autoCreateShiftCollection,
    openRouterPrioritizeFastProviders,
    daybreak,
    isFastModeEnabled,
    isUltrafastEnabled,
    getRequestOptions,
    featureFlags,
    backgroundAgentsEnabled,
    isFeatureEnabled,
    initialize,
  };
});
