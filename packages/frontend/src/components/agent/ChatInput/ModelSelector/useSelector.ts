import type { Model, ModelProvider } from "shared";
import { computed, type MaybeRefOrGetter, ref, toValue, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { getConfiguredProviderIds } from "@/utils/ai";

export type ProviderInfo = {
  id: ModelProvider;
  isConfigured: boolean;
};

const PROVIDER_ORDER: ModelProvider[] = ["openrouter", "anthropic", "google", "openai"];

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openrouter: "OpenRouter",
  anthropic: "Anthropic",
  google: "Google",
  openai: "OpenAI",
};

export const getProviderDisplayName = (provider: ModelProvider): string => {
  return PROVIDER_DISPLAY_NAMES[provider] ?? provider;
};

const providerOrderIndex = (provider: ModelProvider): number => {
  const index = PROVIDER_ORDER.indexOf(provider);
  return index === -1 ? PROVIDER_ORDER.length : index;
};

type UseSelectorOptions = {
  models: MaybeRefOrGetter<Model[]>;
  selectedModel: MaybeRefOrGetter<Model | undefined>;
};

export function useSelector(options: UseSelectorOptions) {
  const sdk = useSDK();

  const configuredProviderIds = computed(() => {
    return new Set(getConfiguredProviderIds(sdk));
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
      isConfigured: configuredProviderIds.value.has(id),
    }));

    return providerList.sort((a, b) => {
      if (a.isConfigured !== b.isConfigured) {
        return a.isConfigured ? -1 : 1;
      }
      return providerOrderIndex(a.id) - providerOrderIndex(b.id);
    });
  });

  const activeProvider = ref<ModelProvider | undefined>(selectedModel.value?.provider);

  watch(selectedModel, (model) => {
    if (model) {
      activeProvider.value = model.provider;
    }
  });

  const isModelConfigured = (model: Model): boolean => {
    return configuredProviderIds.value.has(model.provider);
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
