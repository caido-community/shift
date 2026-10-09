import type { Model, ModelProvider } from "shared";
import { computed, type MaybeRefOrGetter, ref, toValue, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { listUpstreamProviders } from "@/utils/caidoAi";

export type ProviderInfo = {
  id: ModelProvider;
  isConfigured: boolean;
  label: string;
  icon: string;
};

type UseSelectorOptions = {
  models: MaybeRefOrGetter<Model[]>;
  selectedModel: MaybeRefOrGetter<Model | undefined>;
};

export function useSelector(options: UseSelectorOptions) {
  const sdk = useSDK();

  const models = computed(() => toValue(options.models));
  const selectedModel = computed(() => toValue(options.selectedModel));

  const providers = computed<ProviderInfo[]>(() => {
    const ids = [...new Set(models.value.map((model) => model.provider))];
    const statuses = listUpstreamProviders(sdk);
    return ids
      .map(
        (id) =>
          statuses.find((provider) => provider.id === id) ?? {
            id,
            label: id,
            icon: "custom",
            isConfigured: false,
          }
      )
      .sort((a, b) => {
        if (a.isConfigured !== b.isConfigured) return a.isConfigured ? -1 : 1;
        return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
      });
  });

  const activeProvider = ref<ModelProvider | undefined>(selectedModel.value?.provider);

  watch(selectedModel, (model) => {
    if (model) {
      activeProvider.value = model.provider;
    }
  });

  const isModelConfigured = (model: Model): boolean => {
    return (
      providers.value.find((provider) => provider.id === model.provider)?.isConfigured ?? false
    );
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
