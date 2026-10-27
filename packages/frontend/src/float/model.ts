import { useModelsStore } from "@/stores/models";
import { useSettingsStore } from "@/stores/settings";
import { type FrontendSDK } from "@/types";
import { createModel, resolveModel } from "@/utils";

type FloatModelOptions = {
  savedModelKey: string | undefined;
  reasoning: boolean;
  cacheKey?: string;
};

export const createFloatModel = (
  sdk: FrontendSDK,
  { savedModelKey, ...options }: FloatModelOptions
) => {
  const settingsStore = useSettingsStore();
  const modelData = resolveModel({
    sdk,
    savedModelKey,
    enabledModels: useModelsStore().getEnabledModels(),
    usageType: "float",
  });
  if (modelData === undefined) {
    return undefined;
  }

  return {
    modelData,
    model: createModel(sdk, modelData, {
      ...options,
      ...settingsStore.getRequestOptions(modelData),
    }),
  };
};
