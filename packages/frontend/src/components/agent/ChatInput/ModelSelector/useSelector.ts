import { type Component, computed } from "vue";

import {
  AnthropicIcon,
  DeepseekIcon,
  GoogleIcon,
  OpenAIIcon,
  QwenIcon,
  XAIIcon,
} from "./icons";
import UnknownIcon from "./icons/Unknown.vue";

import { type ModelItem, Provider } from "@/agents/types/config";
import { useAgentsStore } from "@/stores/agents";
import { useConfigStore } from "@/stores/config";
import { useModelsStore } from "@/stores/models";

type Variant = "float" | "chat" | "renaming";
type AugmentedModelItem = ModelItem & { icon: Component };

const getIcon = (model: ModelItem) => {
  if (model.provider === Provider.OpenRouter) {
    if (model.id.startsWith("openrouter/anthropic/")) return AnthropicIcon;
    if (model.id.startsWith("openrouter/openai/")) return OpenAIIcon;
    if (model.id.startsWith("openrouter/google/")) return GoogleIcon;
    if (model.id.startsWith("openrouter/deepseek/")) return DeepseekIcon;
    if (model.id.startsWith("openrouter/x-ai/")) return XAIIcon;
    if (model.id.startsWith("openrouter/qwen/")) return QwenIcon;
    if (model.id.startsWith("openrouter/moonshotai/")) return UnknownIcon;
  }
  switch (model.provider) {
    case Provider.OpenAI:
      return OpenAIIcon;
    case Provider.Anthropic:
      return AnthropicIcon;
    case Provider.Google:
      return GoogleIcon;
    case Provider.OpenRouter:
    default:
      return UnknownIcon;
  }
};

export const useSelector = (variant: Variant) => {
  const configStore = useConfigStore();
  const agentsStore = useAgentsStore();
  const modelsStore = useModelsStore();

  const modelId = computed<string>({
    get() {
      switch (variant) {
        case "float":
          return configStore.floatModel;
        case "renaming":
          return configStore.renamingModel;
        case "chat":
          return configStore.agentsModel;
        default:
          throw new Error(`Unknown variant: ${variant}`);
      }
    },
    set(value: string) {
      switch (variant) {
        case "float":
          configStore.floatModel = value;
          break;
        case "renaming":
          configStore.renamingModel = value;
          break;
        case "chat":
          configStore.agentsModel = value;
          {
            const selectedAgentId = agentsStore.selectedId;
            if (
              typeof selectedAgentId === "string" &&
              selectedAgentId.length > 0
            ) {
              agentsStore.updateAgentConfig(selectedAgentId, {
                model: value,
              });
            }
          }
          break;
        default:
          throw new Error(`Unknown variant: ${variant}`);
      }
    },
  });

  // Return flat list of models with icons, filtered by active provider via modelsStore
  const models = computed<AugmentedModelItem[]>(() =>
    modelsStore.activeModels.map((item) => ({
      ...item,
      icon: getIcon(item),
    })),
  );

  const selectedModel = computed<AugmentedModelItem | undefined>(() => {
    // We want to find the model even if it's not in the active list (e.g. provider switched)
    // So we check allModels
    const item = modelsStore.allModels.find((i) => i.id === modelId.value);
    if (!item) return undefined;
    return { ...item, icon: getIcon(item) };
  });

  return {
    modelId,
    models,
    selectedModel,
  };
};
