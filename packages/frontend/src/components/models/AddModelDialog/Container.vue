<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";

import { useForm } from "./useForm";

import { type ModelItem } from "@/agents/types/config";

const { visible } = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "add", model: ModelItem): void;
}>();

const {
  name,
  id,
  isReasoningModel,
  provider,
  providers,
  handleSave,
  handleCancel,
} = useForm(
  (model: ModelItem) => emit("add", model),
  () => emit("update:visible", false),
);

const handleVisibilityUpdate = (val: boolean) => {
  emit("update:visible", val);
};
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Add Custom Model"
    :style="{ width: '30rem' }"
    @update:visible="handleVisibilityUpdate"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="provider" class="font-medium text-surface-200"
          >Provider</label
        >
        <Dropdown
          id="provider"
          v-model="provider"
          :options="providers"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-2">
        <label for="name" class="font-medium text-surface-200">Name</label>
        <InputText
          id="name"
          v-model="name"
          placeholder="Sonnet 4.5"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-2">
        <label for="id" class="font-medium text-surface-200">Model ID</label>
        <InputText
          id="id"
          v-model="id"
          placeholder="openrouter/anthropic/claude-sonnet-4.5"
          class="w-full"
        />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox v-model="isReasoningModel" binary input-id="reasoning" />
        <label for="reasoning" class="text-surface-200"
          >Is Reasoning Model</label
        >
      </div>
    </div>
    <template #footer>
      <Button label="Cancel" text severity="secondary" @click="handleCancel" />
      <Button label="Add" :disabled="!name || !id" @click="handleSave" />
    </template>
  </Dialog>
</template>
