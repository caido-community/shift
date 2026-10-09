import { useLocalStorage } from "@vueuse/core";
import { createModelKey, type Model } from "shared";
import { computed, type MaybeRefOrGetter, nextTick, type Ref, ref, toValue, watch } from "vue";

import { type ProviderInfo, useSelector } from "./useSelector";

import { getReasoningEfforts, type ReasoningEffort, resolveReasoningEffort } from "@/utils/ai";

type ModelWithConfig = Model & { isConfigured: boolean };

type UseModelSelectorOptions = {
  models: MaybeRefOrGetter<Model[]>;
  selectedModel: Ref<Model | undefined>;
  selectedReasoningEffort: Ref<ReasoningEffort | undefined>;
  disabled: MaybeRefOrGetter<boolean>;
  reasoningMode: MaybeRefOrGetter<"standard" | "variant">;
  containerRef: Ref<HTMLElement | undefined>;
};

const effortLabels: Record<ReasoningEffort, string> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
  max: "Max",
};

const RECENT_LIMIT = 5;

const keyOf = (model: Model) => createModelKey(model.provider, model.id);
const displayName = (model: Model) => model.name.replace(/^Claude /, "");

export function useModelSelector(options: UseModelSelectorOptions) {
  const { providers, activeProvider, providerModels, selectProvider } = useSelector({
    models: options.models,
    selectedModel: options.selectedModel,
  });
  const openMenu = ref<"model" | "effort">();
  const isOpen = computed(() => openMenu.value === "model");
  const isEffortOpen = computed(() => openMenu.value === "effort");
  const query = ref("");
  const showRecent = ref(false);
  const recentKeys = useLocalStorage<string[]>("shift-recent-models", []);
  const selectedModel = computed(() => options.selectedModel.value);
  const isDisabled = computed(() => toValue(options.disabled));
  const usesReasoningVariants = computed(() => toValue(options.reasoningMode) === "variant");
  const isSelected = (model: Model) =>
    selectedModel.value !== undefined && keyOf(model) === keyOf(selectedModel.value);

  const findProvider = (id: string) => providers.value.find((provider) => provider.id === id);
  const selectedProvider = computed(() =>
    selectedModel.value === undefined ? undefined : findProvider(selectedModel.value.provider)
  );
  const withConfig = (model: Model): ModelWithConfig => ({
    ...model,
    isConfigured: findProvider(model.provider)?.isConfigured ?? false,
  });
  const recentModels = computed(() =>
    recentKeys.value
      .map((key) => toValue(options.models).find((model) => keyOf(model) === key))
      .filter((model): model is Model => model !== undefined)
      .map(withConfig)
  );
  const isSearching = computed(() => query.value.trim() !== "");
  const listedModels = computed<ModelWithConfig[]>(() => {
    if (isSearching.value) {
      const needle = query.value.trim().toLowerCase();
      return toValue(options.models)
        .filter((model) =>
          `${model.name} ${model.id} ${findProvider(model.provider)?.label ?? model.provider}`
            .toLowerCase()
            .includes(needle)
        )
        .map(withConfig);
    }
    return showRecent.value ? recentModels.value : providerModels.value;
  });
  const showProviderLogos = computed(() => isSearching.value || showRecent.value);
  const providerSuffix = (model: Model) => {
    const name = displayName(model);
    const isAmbiguous = listedModels.value.some(
      (other) => other.provider !== model.provider && displayName(other) === name
    );
    return isAmbiguous ? `via ${findProvider(model.provider)?.label ?? model.provider}` : undefined;
  };
  const isRecentActive = computed(() => !isSearching.value && showRecent.value);
  const isProviderActive = (provider: ProviderInfo) =>
    !isSearching.value && !showRecent.value && activeProvider.value === provider.id;

  const reasoningEfforts = computed(() =>
    usesReasoningVariants.value && selectedModel.value !== undefined
      ? getReasoningEfforts(selectedModel.value)
      : []
  );
  const showEffortPicker = computed(() => reasoningEfforts.value.length > 0);
  const reasoningEffort = computed(() =>
    selectedModel.value === undefined
      ? undefined
      : resolveReasoningEffort(
          selectedModel.value,
          options.selectedReasoningEffort.value ?? "medium"
        )
  );
  const isSelectedEffort = (effort: ReasoningEffort) => reasoningEffort.value === effort;

  const selectedModelLabel = computed(() =>
    selectedModel.value === undefined ? "Select model" : displayName(selectedModel.value)
  );

  watch(
    [() => toValue(options.models), selectedModel],
    ([models, current]) => {
      if (current === undefined) return;
      const fresh = models.find((model) => keyOf(model) === keyOf(current));
      if (fresh !== undefined && fresh !== current) options.selectedModel.value = fresh;
    },
    { immediate: true }
  );

  watch(
    reasoningEffort,
    (effort) => {
      if (
        usesReasoningVariants.value &&
        effort !== undefined &&
        effort !== options.selectedReasoningEffort.value
      ) {
        options.selectedReasoningEffort.value = effort;
      }
    },
    { immediate: true }
  );

  const close = () => {
    openMenu.value = undefined;
    query.value = "";
  };
  const toggle = () => {
    if (isDisabled.value) return;
    if (isOpen.value) {
      close();
      return;
    }
    query.value = "";
    showRecent.value = false;
    if (selectedModel.value !== undefined) activeProvider.value = selectedModel.value.provider;
    openMenu.value = "model";
  };
  const toggleEffort = () => {
    if (isDisabled.value || !showEffortPicker.value) return;
    if (isEffortOpen.value) {
      close();
      return;
    }
    query.value = "";
    openMenu.value = "effort";
  };
  const handleSelect = (model: ModelWithConfig) => {
    if (!model.isConfigured) return;
    const key = keyOf(model);
    options.selectedModel.value =
      toValue(options.models).find((candidate) => keyOf(candidate) === key) ?? model;
    recentKeys.value = [key, ...recentKeys.value.filter((recent) => recent !== key)].slice(
      0,
      RECENT_LIMIT
    );
    close();
  };
  const selectFirstMatch = () => {
    const match = listedModels.value.find((model) => model.isConfigured);
    if (match !== undefined) handleSelect(match);
  };
  const handleProviderClick = (provider: ProviderInfo) => {
    selectProvider(provider);
    showRecent.value = false;
    query.value = "";
  };
  const showRecentModels = () => {
    showRecent.value = true;
    query.value = "";
  };
  const handleEffortSelect = (effort: ReasoningEffort) => {
    if (!reasoningEfforts.value.includes(effort)) return;
    options.selectedReasoningEffort.value = effort;
    close();
  };
  watch(openMenu, (menu) => {
    if (menu === undefined) return;
    void nextTick(() => {
      const container = options.containerRef.value;
      for (const selector of [
        '[data-selected-provider="true"]',
        '[data-selected-model="true"]',
        '[data-selected-effort="true"]',
      ]) {
        container?.querySelector<HTMLElement>(selector)?.scrollIntoView({ block: "nearest" });
      }
      if (menu === "model") container?.querySelector<HTMLInputElement>("input")?.focus();
    });
  });
  return {
    isOpen,
    isEffortOpen,
    query,
    providers,
    selectedProvider,
    listedModels,
    recentModels,
    showProviderLogos,
    providerSuffix,
    isRecentActive,
    isProviderActive,
    reasoningEfforts,
    reasoningEffort,
    effortLabels,
    showEffortPicker,
    selectedModelLabel,
    displayName,
    isSelected,
    isSelectedEffort,
    close,
    toggle,
    toggleEffort,
    handleSelect,
    selectFirstMatch,
    handleProviderClick,
    showRecentModels,
    handleEffortSelect,
  };
}
