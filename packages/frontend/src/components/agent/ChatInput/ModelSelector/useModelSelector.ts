import type { Model } from "shared";
import { computed, type MaybeRefOrGetter, nextTick, type Ref, ref, toValue, watch } from "vue";

import { type ProviderInfo, useSelector } from "./useSelector";

import type { ReasoningEffort } from "@/utils/ai";

type EffortConfig = {
  label: string;
  description: string;
};

type ModelWithConfig = Model & { isConfigured: boolean };

type UseModelSelectorOptions = {
  models: MaybeRefOrGetter<Model[]>;
  selectedModel: Ref<Model | undefined>;
  selectedReasoningEffort: Ref<ReasoningEffort | undefined>;
  disabled: MaybeRefOrGetter<boolean>;
  reasoningMode: MaybeRefOrGetter<"standard" | "variant">;
  containerRef: Ref<HTMLElement | undefined>;
};

const reasoningEfforts: ReasoningEffort[] = ["low", "medium", "high"];

const effortConfig: Record<ReasoningEffort, EffortConfig> = {
  low: {
    label: "Low",
    description: "Faster responses with lighter reasoning.",
  },
  medium: {
    label: "Medium",
    description: "Balanced speed and reasoning depth.",
  },
  high: {
    label: "High",
    description: "Deeper reasoning with potentially slower responses.",
  },
};

export function useModelSelector(options: UseModelSelectorOptions) {
  const { providers, activeProvider, providerModels, selectProvider } = useSelector({
    models: options.models,
    selectedModel: options.selectedModel,
  });

  const reasoningEffort = computed<ReasoningEffort>({
    get: () => options.selectedReasoningEffort.value ?? "medium",
    set: (value) => {
      options.selectedReasoningEffort.value = value;
    },
  });
  const isOpen = ref(false);
  const activeReasoningModelId = ref<string | undefined>(undefined);

  const usesReasoningVariants = computed(() => toValue(options.reasoningMode) === "variant");
  const isDisabled = computed(() => toValue(options.disabled));

  const activeReasoningModel = computed(() => {
    if (activeReasoningModelId.value === undefined) return undefined;
    return providerModels.value.find((model) => model.id === activeReasoningModelId.value);
  });

  const shouldShowEffortStep = computed(
    () => usesReasoningVariants.value && activeReasoningModel.value?.capabilities.reasoning === true
  );

  const selectedModelLabel = computed(() => {
    const model = options.selectedModel.value;
    if (model === undefined) return "Select model";
    if (!usesReasoningVariants.value || model.capabilities.reasoning !== true) {
      return model.name;
    }
    return `${model.name} ${effortConfig[reasoningEffort.value].label}`;
  });

  const close = () => {
    isOpen.value = false;
    activeReasoningModelId.value = undefined;
  };

  const toggle = () => {
    if (isDisabled.value) return;
    const next = !isOpen.value;
    isOpen.value = next;
    if (!next) {
      activeReasoningModelId.value = undefined;
      return;
    }

    const model = options.selectedModel.value;
    if (
      usesReasoningVariants.value &&
      model !== undefined &&
      model.capabilities.reasoning &&
      model.provider === activeProvider.value
    ) {
      activeReasoningModelId.value = model.id;
    }
  };

  const handleSelect = (model: ModelWithConfig) => {
    if (!model.isConfigured) return;
    if (usesReasoningVariants.value && model.capabilities.reasoning) {
      activeReasoningModelId.value = model.id;
      return;
    }
    options.selectedModel.value = model;
    close();
  };

  const handleProviderClick = (provider: ProviderInfo) => {
    selectProvider(provider);
    activeReasoningModelId.value = undefined;
  };

  const handleEffortSelect = (effort: ReasoningEffort) => {
    if (!usesReasoningVariants.value) return;
    const model = activeReasoningModel.value;
    if (model === undefined || !model.isConfigured || !model.capabilities.reasoning) return;
    reasoningEffort.value = effort;
    options.selectedModel.value = model;
    close();
  };

  const scrollItemIntoView = (selector: string) => {
    const item = options.containerRef.value?.querySelector<HTMLElement>(selector);
    if (item === undefined || item === null) return;
    item.scrollIntoView({ block: "center" });
  };

  const scrollSelectedItemsIntoView = () => {
    scrollItemIntoView('[data-selected-provider="true"]');
    scrollItemIntoView('[data-selected-model="true"]');
    scrollItemIntoView('[data-selected-effort="true"]');
  };

  watch(isOpen, (open, wasOpen) => {
    if (!open || wasOpen) return;
    void nextTick(() => {
      scrollSelectedItemsIntoView();
    });
  });

  return {
    isOpen,
    providers,
    activeProvider,
    providerModels,
    activeReasoningModelId,
    usesReasoningVariants,
    activeReasoningModel,
    shouldShowEffortStep,
    selectedModelLabel,
    reasoningEfforts,
    effortConfig,
    reasoningEffort,
    close,
    toggle,
    handleSelect,
    handleProviderClick,
    handleEffortSelect,
  };
}
