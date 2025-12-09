import { useConfigStore } from "@/stores/config";
import { defaultModels } from "@/stores/config/models";
import type { FrontendSDK } from "@/types";

export type CreateModelOptions = {
  structuredOutput?: boolean;
};

export function createModel(
  sdk: FrontendSDK,
  modelId: string,
  options: CreateModelOptions = {},
) {
  const { structuredOutput = true } = options;
  const configStore = useConfigStore();

  const allModels = [...defaultModels, ...configStore.customModels];
  const modelInfo = allModels.find((m) => m.id === modelId);
  const isReasoningModel = modelInfo?.isReasoningModel ?? false;

  const provider = sdk.ai.createProvider();

  return provider(modelId, {
    ...(isReasoningModel && {
      reasoning: {
        effort: "high",
      },
    }),
    capabilities: {
      reasoning: isReasoningModel,
      structured_output: structuredOutput,
    },
  });
}
