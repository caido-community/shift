<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { ref } from "vue";

import { useSelector } from "./useSelector";

const props = defineProps<{
  variant: "float" | "chat" | "renaming";
  disabled?: boolean;
}>();

const { groups, modelId, selectedModel, isCustomModel } = useSelector(props.variant);

const showCustomDialog = ref(false);
const customModelInput = ref("");

const openCustomDialog = () => {
  customModelInput.value = isCustomModel.value ? modelId.value : "";
  showCustomDialog.value = true;
};

const applyCustomModel = () => {
  if (customModelInput.value.trim()) {
    modelId.value = customModelInput.value.trim();
    showCustomDialog.value = false;
  }
};
</script>

<template>
  <div class="flex gap-2 items-center">
    <Select
      v-model="modelId"
      :disabled="props.disabled === true"
      :options="groups"
      option-label="name"
      option-value="id"
      option-group-label="label"
      option-group-children="items"
      filter
      filter-placeholder="Search models..."
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
            selectedModel?.name ?? modelId ?? "Select model"
          }}</span>
        </div>
      </template>

      <template #optiongroup="slotProps">
        <div class="py-1 text-xs font-medium text-surface-400">
          {{ slotProps.option.label }}
        </div>
      </template>

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

    <Button
      icon="fas fa-keyboard"
      severity="secondary"
      outlined
      size="small"
      :disabled="props.disabled === true"
      v-tooltip.top="'Enter custom model ID'"
      @click="openCustomDialog"
    />

    <Dialog
      v-model:visible="showCustomDialog"
      modal
      header="Custom Model ID"
      :style="{ width: '450px' }"
    >
      <div class="flex flex-col gap-3">
        <p class="text-sm text-surface-400">
          Enter any OpenRouter model identifier (e.g., anthropic/claude-3-opus, meta-llama/llama-3-70b)
        </p>
        <InputText
          v-model="customModelInput"
          placeholder="provider/model-name"
          class="w-full font-mono"
          @keydown.enter="applyCustomModel"
        />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          text
          @click="showCustomDialog = false"
        />
        <Button
          label="Apply"
          :disabled="!customModelInput.trim()"
          @click="applyCustomModel"
        />
      </template>
    </Dialog>
  </div>
</template>
