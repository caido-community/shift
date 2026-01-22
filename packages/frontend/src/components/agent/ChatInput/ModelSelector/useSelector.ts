import type { Model, ModelProvider } from "shared";
import { computed, type MaybeRefOrGetter, ref, toValue, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { getProviderStatuses } from "@/utils/ai";

export type ProviderInfo = {
  id: ModelProvider;
  isConfigured: boolean;
};

const PROVIDER_ORDER: ModelProvider[] = ["openrouter", "anthropic", "google", "openai"];

const PROVIDER_DISPLAY_NAMES: Record<ModelProvider, string> = {
  openrouter: "OpenRouter",
  anthropic: "Anthropic",
  google: "Google",
  openai: "OpenAI",
};

export const getProviderDisplayName = (provider: ModelProvider): string => {
  return PROVIDER_DISPLAY_NAMES[provider];
};

type UseSelectorOptions = {
  models: MaybeRefOrGetter<Model[]>;
  selectedModel: MaybeRefOrGetter<Model | undefined>;
};

export function useSelector(options: UseSelectorOptions) {
  const sdk = useSDK();

  const providerStatuses = computed(() => {
    const statuses = getProviderStatuses(sdk);
    return new Map(statuses.map((s) => [s.id as ModelProvider, s.isConfigured]));
  });

  const models = computed(() => toValue(options.models));
  const selectedModel = computed(() => toValue(options.selectedModel));

  const providers = computed<ProviderInfo[]>(() => {
    const seen = new Set<ModelProvider>();
    for (const model of models.value) {
      seen.add(model.provider);
    }

    const providerList = [...seen].map((id) => ({
      id,
      isConfigured: providerStatuses.value.get(id) ?? false,
    }));

    return providerList.sort((a, b) => {
      if (a.isConfigured !== b.isConfigured) {
        return a.isConfigured ? -1 : 1;
      }
      return PROVIDER_ORDER.indexOf(a.id) - PROVIDER_ORDER.indexOf(b.id);
    });
  });

  const activeProvider = ref<ModelProvider | undefined>(selectedModel.value?.provider);

  watch(selectedModel, (model) => {
    if (model) {
      activeProvider.value = model.provider;
    }
  });

  const isModelConfigured = (model: Model): boolean => {
    return providerStatuses.value.get(model.provider) ?? false;
  };

  const providerModels = computed(() => {
    const filteredModels =
      activeProvider.value === undefined
        ? models.value
        : models.value.filter((m) => m.provider === activeProvider.value);

    return filteredModels.map((model) => ({
      ...model,
      isConfigured: isModelConfigured(model),
    }));
  });

  const selectProvider = (provider: ProviderInfo): void => {
    if (!provider.isConfigured) return;
    activeProvider.value = provider.id;
  };

  return {
    providers,
    activeProvider,
    providerModels,
    selectedModel,
    selectProvider,
  };
}
