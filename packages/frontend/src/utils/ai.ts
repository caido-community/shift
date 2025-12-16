import { Provider } from "@/agents/types/config";
import { useConfigStore } from "@/stores/config";
import { defaultModels } from "@/stores/config/models";
import type { FrontendSDK } from "@/types";

type CreateModelOptions = {
  structuredOutput?: boolean;
  reasoning?: boolean;
};

export function createModel(
  sdk: FrontendSDK,
  modelId: string,
  options: CreateModelOptions = {},
) {
  const { structuredOutput = true, reasoning = true } = options;
  const configStore = useConfigStore();

  const baseModelId = modelId.split(":")[0] ?? modelId;
  const allModels = [...defaultModels, ...configStore.customModels];
  const modelInfo = allModels.find((m) => m.id === baseModelId);
  const isReasoningModel = reasoning && (modelInfo?.isReasoningModel ?? false);

  const provider = sdk.ai.createProvider();

  const isOpenRouterModel =
    modelInfo?.provider === Provider.OpenRouter ||
    baseModelId.startsWith("openrouter/");

  const resolvedModelId =
    isOpenRouterModel &&
    configStore.openRouterPrioritizeLatency &&
    !modelId.includes(":")
      ? `${modelId}:nitro`
      : modelId;

  return provider(resolvedModelId, {
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
