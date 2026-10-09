<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { type Model } from "shared";
import { computed, ref } from "vue";

import ProviderLogo from "./ProviderLogo.vue";
import { hint } from "./tooltip";
import { useModelSelector } from "./useModelSelector";

import type { ReasoningEffort } from "@/utils/ai";

const {
  models,
  size = "default",
  disabled = false,
  direction = "up",
  reasoningMode = "standard",
} = defineProps<{
  models: Model[];
  size?: "default" | "small";
  disabled?: boolean;
  direction?: "up" | "down";
  reasoningMode?: "standard" | "variant";
}>();

const selectedModel = defineModel<Model | undefined>();
const selectedReasoningEffort = defineModel<ReasoningEffort>("reasoningEffort", {
  default: "medium",
});
const containerRef = ref<HTMLElement>();
const {
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
} = useModelSelector({
  models: () => models,
  selectedModel,
  selectedReasoningEffort,
  disabled: () => disabled,
  reasoningMode: () => reasoningMode,
  containerRef,
});

onClickOutside(containerRef, close);

const triggerClass = computed(() => [
  "flex items-center rounded px-1 py-1 text-surface-200 transition-colors",
  size === "default" ? "gap-1.5 text-sm" : "gap-1 text-xs",
  disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:text-surface-0",
]);
const popoverClass = computed(() => [
  "absolute left-0 z-[10001] overflow-hidden rounded-lg border border-surface-700 bg-surface-900 shadow-xl",
  direction === "up" ? "bottom-full mb-1.5 origin-bottom-left" : "top-full mt-1.5 origin-top-left",
]);
const popEnterFrom = computed(() =>
  direction === "up" ? "opacity-0 scale-95 translate-y-1" : "opacity-0 scale-95 -translate-y-1"
);
const railButtonClass = (active: boolean, enabled = true) => [
  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition",
  !enabled
    ? "cursor-not-allowed opacity-30"
    : active
      ? "bg-surface-700 text-surface-0"
      : "text-surface-400 opacity-80 hover:bg-surface-800 hover:text-surface-200 hover:opacity-100",
];
</script>

<template>
  <div
    ref="containerRef"
    class="relative flex items-center gap-1"
    @keydown.esc.stop="close">
    <button
      type="button"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :class="triggerClass"
      @click="toggle">
      <ProviderLogo
        v-if="selectedProvider !== undefined"
        :icon="selectedProvider.icon" />
      <span class="min-w-0 max-w-[190px] flex-1 truncate text-left">{{ selectedModelLabel }}</span>
      <i
        :class="[
          'fas fa-chevron-down transition-transform text-surface-600',
          size === 'default' ? 'text-[8px]' : 'text-[7px]',
          isOpen ? 'rotate-180' : '',
        ]"
        aria-hidden="true" />
    </button>

    <Transition
      enter-active-class="transition duration-[120ms] ease-out"
      :enter-from-class="popEnterFrom"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div
        v-if="isOpen"
        :class="[popoverClass, 'flex h-80 w-[22rem] flex-row']"
        @mousedown.stop>
        <div
          class="scrollbar-hide flex w-12 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-surface-700 bg-surface-800/40 py-1.5">
          <template v-if="recentModels.length > 0">
            <button
              v-tooltip.right="hint('Recent')"
              type="button"
              aria-label="Recent models"
              :class="railButtonClass(isRecentActive)"
              @click="showRecentModels">
              <i
                class="fas fa-clock text-xs"
                aria-hidden="true" />
              <span
                v-if="isRecentActive"
                class="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded bg-primary-500" />
            </button>
            <div class="my-0.5 h-px w-5 shrink-0 bg-surface-700" />
          </template>
          <button
            v-for="provider in providers"
            :key="provider.id"
            v-tooltip.right="
              hint(provider.label, provider.isConfigured ? undefined : 'Not configured')
            "
            type="button"
            :aria-label="provider.label"
            :disabled="!provider.isConfigured"
            :data-selected-provider="isProviderActive(provider) ? 'true' : undefined"
            :class="railButtonClass(isProviderActive(provider), provider.isConfigured)"
            @click="handleProviderClick(provider)">
            <ProviderLogo
              :icon="provider.icon"
              :size="18" />
            <span
              v-if="isProviderActive(provider)"
              class="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded bg-primary-500" />
          </button>
        </div>

        <div class="flex min-w-0 flex-1 flex-col">
          <div
            class="flex items-center gap-1.5 border-b border-surface-700 py-1 pl-3 pr-1 text-surface-500">
            <i
              class="fas fa-search text-[11px]"
              aria-hidden="true" />
            <input
              v-model="query"
              type="text"
              placeholder="Search models"
              aria-label="Search models"
              spellcheck="false"
              autocomplete="off"
              class="min-w-0 flex-1 border-0 bg-transparent py-1 text-sm text-surface-200 outline-none placeholder:text-surface-500"
              @keydown.enter.prevent="selectFirstMatch" />
          </div>
          <div class="flex flex-1 flex-col overflow-y-auto">
            <button
              v-for="model in listedModels"
              :key="`${model.provider}/${model.id}`"
              type="button"
              :disabled="!model.isConfigured"
              :data-selected-model="isSelected(model) ? 'true' : undefined"
              :class="[
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                !model.isConfigured
                  ? 'cursor-not-allowed text-surface-600'
                  : isSelected(model)
                    ? 'text-surface-0'
                    : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @click="handleSelect(model)">
              <ProviderLogo
                v-if="showProviderLogos"
                :icon="providers.find((provider) => provider.id === model.provider)?.icon ?? ''" />
              <span class="min-w-0 flex-1 truncate">
                {{ displayName(model) }}
                <span
                  v-if="providerSuffix(model) !== undefined"
                  class="text-surface-500">
                  {{ providerSuffix(model) }}
                </span>
              </span>
              <i
                v-if="!model.isConfigured"
                class="fas fa-exclamation-circle text-[10px] text-surface-500"
                aria-hidden="true" />
              <i
                v-else-if="isSelected(model)"
                class="fas fa-check text-xs text-surface-200"
                aria-hidden="true" />
            </button>
            <div
              v-if="listedModels.length === 0"
              class="flex flex-1 items-center justify-center px-4 text-center text-sm text-surface-500">
              {{ query.trim() === "" ? "No models available" : "No models match" }}
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <template v-if="showEffortPicker && reasoningEffort !== undefined">
      <div class="relative">
        <button
          type="button"
          :disabled="disabled"
          :aria-expanded="isEffortOpen"
          aria-label="Reasoning effort"
          :class="triggerClass"
          @click="toggleEffort">
          <i
            class="fas fa-brain text-[11px]"
            aria-hidden="true" />
          <span>{{ effortLabels[reasoningEffort] }}</span>
          <i
            :class="[
              'fas fa-chevron-down transition-transform text-surface-600',
              size === 'default' ? 'text-[8px]' : 'text-[7px]',
              isEffortOpen ? 'rotate-180' : '',
            ]"
            aria-hidden="true" />
        </button>

        <Transition
          enter-active-class="transition duration-[120ms] ease-out"
          :enter-from-class="popEnterFrom"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95">
          <div
            v-if="isEffortOpen"
            :class="[popoverClass, 'w-44 p-1']"
            @mousedown.stop>
            <div class="px-2 pb-1 pt-1.5 text-xs text-surface-500">Reasoning</div>
            <button
              v-for="effort in reasoningEfforts"
              :key="effort"
              type="button"
              :data-selected-effort="isSelectedEffort(effort) ? 'true' : undefined"
              :class="[
                'flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                isSelectedEffort(effort)
                  ? 'bg-surface-700/60 text-surface-0'
                  : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @click="handleEffortSelect(effort)">
              {{ effortLabels[effort] }}
            </button>
          </div>
        </Transition>
      </div>
    </template>
  </div>
</template>
