<script setup lang="ts">
import Select from "primevue/select";

import { useSelector } from "./useSelector";

const props = defineProps<{
  variant: "float" | "chat" | "renaming";
  disabled?: boolean;
}>();

// Using 'models' instead of 'groups'
const { models, modelId, selectedModel } = useSelector(props.variant);
</script>

<template>
  <Select
    v-model="modelId"
    :disabled="props.disabled === true"
    :options="models"
    option-label="name"
    option-value="id"
    filter
    filter-placeholder="Search models..."
    overlay-class="!z-[1202]"
    :overlay-style="{
      backgroundColor:
        variant === 'chat' ? 'var(--p-surface-900)' : 'var(--p-surface-800)',
      opacity: props.disabled === true ? 0.5 : 1,
    }"
    :pt="{
      root: {
        class:
          'inline-flex relative rounded-md bg-transparent invalid:focus:ring-red-200 invalid:hover:border-red-500 transition-all duration-200 hover:border-secondary-400 cursor-pointer select-none',
      },
      label: {
        class:
          'leading-[normal] block flex-auto bg-transparent border-0 text-white/80 placeholder:text-surface-500 w-[1%] ounded-none transition duration-200 focus:outline-none focus:shadow-none relative cursor-pointer overflow-hidden overflow-ellipsis whitespace-nowrap appearance-none font-mono',
      },
      optionGroup: { class: 'px-2' },
      dropdownicon: { class: 'h-2 mb-0.5' },
      header: {
        style: {
          background: 'none',
        },
      },
    }"
  >
    <template #value>
      <div
        :class="[
          'flex items-center gap-2 w-full text-surface-400 text-sm transition-colors duration-200',
          props.disabled !== true ? 'hover:text-surface-200' : '',
        ]"
      >
        <component
          :is="selectedModel?.icon ?? undefined"
          v-if="selectedModel?.icon !== undefined"
          class="h-4 w-4"
        />
        <div v-else class="h-3 w-3 rounded-sm bg-surface-500" />
        <span class="truncate">{{
          selectedModel?.name ?? "Select model"
        }}</span>
      </div>
    </template>

    <!-- Removed optiongroup slot -->

    <template #option="slotProps">
      <div class="flex items-center gap-2 text-surface-300 text-sm">
        <component
          :is="slotProps.option.icon ?? undefined"
          v-if="slotProps.option.icon !== undefined"
          class="h-4 w-4"
        />
        <div v-else class="h-3 w-3 rounded-sm bg-surface-500" />
        <span class="truncate">{{ slotProps.option.name }}</span>
      </div>
    </template>
  </Select>
</template>
