import {
  type FeatureFlagKey,
  isFeatureFlagEnabled as resolveFeatureFlag,
  featureFlagEntries as sharedFeatureFlagEntries,
} from "shared";

import { useSettingsStore } from "../stores/settings";

export const featureFlagEntries = sharedFeatureFlagEntries;

export const isFeatureEnabled = (flag: FeatureFlagKey): boolean => {
  const settingsStore = useSettingsStore();
  return resolveFeatureFlag(settingsStore.featureFlags, flag);
};
