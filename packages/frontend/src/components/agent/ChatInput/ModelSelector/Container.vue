<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import type { Model } from "shared";
import { ref } from "vue";

import { getProviderDisplayName, type ProviderInfo, useSelector } from "./useSelector";

const {
  models,
  size = "default",
  disabled = false,
  direction = "up",
} = defineProps<{
  models: Model[];
  size?: "default" | "small";
  disabled?: boolean;
  direction?: "up" | "down";
}>();

const selectedModel = defineModel<Model | undefined>();

const { providers, activeProvider, providerModels, selectProvider } = useSelector({
  models: () => models,
  selectedModel,
});

const isOpen = ref(false);
const containerRef = ref<HTMLElement>();

onClickOutside(containerRef, () => {
  isOpen.value = false;
});

const toggle = () => {
  if (disabled) return;
  isOpen.value = !isOpen.value;
};

type ModelWithConfig = Model & { isConfigured: boolean };

const handleSelect = (model: ModelWithConfig) => {
  if (!model.isConfigured) return;
  selectedModel.value = model;
  isOpen.value = false;
};

const handleProviderClick = (provider: ProviderInfo) => {
  selectProvider(provider);
};
</script>

<template>
  <div
    ref="containerRef"
    class="relative">
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'flex items-center rounded transition-colors',
        size === 'default'
          ? 'gap-1.5 px-1 py-1 text-sm hover:text-surface-200'
          : 'gap-1 px-1 py-1 text-xs hover:text-surface-200',
        'text-surface-400',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]"
      @click="toggle">
      <span class="truncate max-w-[160px]">
        {{ selectedModel?.name ?? "Select model" }}
      </span>
      <i
        :class="[
          'fas fa-chevron-down transition-transform text-surface-600',
          size === 'default' ? 'text-[8px]' : 'text-[7px]',
          isOpen ? 'rotate-180' : '',
        ]" />
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95">
      <div
        v-if="isOpen"
        :class="[
          'absolute left-0 z-[10001] flex h-52 w-72 flex-row overflow-hidden rounded-lg border border-surface-700 bg-surface-900 shadow-xl',
          direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1',
        ]">
        <div
          class="flex w-28 flex-col overflow-y-auto border-r border-surface-700 bg-surface-800/30">
          <button
            v-for="provider in providers"
            :key="provider.id"
            v-tooltip.left="
              provider.isConfigured
                ? undefined
                : `${getProviderDisplayName(provider.id)} is not configured`
            "
            type="button"
            :disabled="!provider.isConfigured"
            :class="[
              'group relative flex items-center justify-between px-2.5 py-2 text-left text-sm transition-colors',
              !provider.isConfigured
                ? 'cursor-not-allowed text-surface-500'
                : activeProvider === provider.id
                  ? 'bg-surface-700/50 text-surface-100 font-medium'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
            ]"
            @click="handleProviderClick(provider)">
            <span class="truncate">{{ getProviderDisplayName(provider.id) }}</span>
            <i
              v-if="!provider.isConfigured"
              class="fas fa-exclamation-circle text-[10px] text-surface-600" />
            <div
              v-if="activeProvider === provider.id"
              class="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-500" />
          </button>
        </div>

        <div class="flex flex-1 flex-col overflow-y-auto bg-surface-900">
          <div
            v-if="providerModels.length > 0"
            class="flex flex-col py-1">
            <button
              v-for="model in providerModels"
              :key="model.id"
              v-tooltip.right="
                model.isConfigured
                  ? undefined
                  : `${getProviderDisplayName(model.provider)} is not configured`
              "
              type="button"
              :disabled="!model.isConfigured"
              :class="[
                'w-full truncate px-3 py-1.5 text-left text-sm transition-colors',
                !model.isConfigured
                  ? 'cursor-not-allowed text-surface-600'
                  : model.id === selectedModel?.id
                    ? 'bg-surface-700 text-surface-100'
                    : 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
              ]"
              @click="handleSelect(model)">
              <div class="flex items-center justify-between gap-2">
                <span class="truncate">{{ model.name }}</span>
                <i
                  v-if="!model.isConfigured"
                  class="fas fa-exclamation-circle text-[10px] text-surface-500" />
                <i
                  v-else-if="model.id === selectedModel?.id"
                  class="fas fa-check text-xs text-surface-100" />
              </div>
            </button>
          </div>

          <div
            v-else-if="activeProvider !== undefined"
            class="flex flex-1 items-center justify-center px-4 text-center text-sm text-surface-500">
            No models available for {{ getProviderDisplayName(activeProvider) }}
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
