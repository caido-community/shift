import { createModelKey, type Model } from "shared";
import { computed } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { resolveModel } from "@/utils/ai";

type ModelSetting = "agentsModel" | "floatModel" | "renamingModel";

export function useModelSetting(setting: ModelSetting, usageType: "agent" | "float") {
  const sdk = useSDK();
  const modelsStore = useModelsStore();
  const settingsStore = useSettingsStore();

  const models = computed(() => modelsStore.getEnabledModels());
  const model = computed({
    get: () =>
      resolveModel({
        sdk,
        savedModelKey: settingsStore.config[setting],
        enabledModels: models.value,
        usageType,
      }),
    set: (value: Model | undefined) => {
      if (value === undefined) return;
      void settingsStore.update({ [setting]: createModelKey(value.provider, value.id) });
    },
  });

  return { models, model };
}
