import {
  defaultFeatureFlags,
  FEATURE_FLAGS,
  type FeatureFlagKey,
  type FeatureFlagsConfig,
  isFeatureFlagEnabled as resolveFeatureFlag,
  featureFlagEntries as sharedFeatureFlagEntries,
} from "shared";
import { computed } from "vue";

import { useSettingsStore } from "../stores/settings";

export const featureFlags = FEATURE_FLAGS;
export const featureFlagEntries = sharedFeatureFlagEntries;

export const useFeatureFlags = () => {
  const settingsStore = useSettingsStore();

  const flags = computed<FeatureFlagsConfig>(() => {
    return settingsStore.featureFlags ?? defaultFeatureFlags;
  });

  const isEnabled = (flag: FeatureFlagKey): boolean => {
    return resolveFeatureFlag(flags.value, flag);
  };

  return {
    flags,
    isEnabled,
  };
};

export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  const settingsStore = useSettingsStore();
  return resolveFeatureFlag(settingsStore.featureFlags, flag);
};
