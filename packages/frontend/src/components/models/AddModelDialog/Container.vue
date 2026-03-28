<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputText from "primevue/inputtext";
import {
  getProviderReasoningDisabledMessage,
  type Model,
  ModelProvider,
  type ModelProvider as ModelProviderType,
} from "shared";
import { computed, ref, watch } from "vue";

const { initialProvider } = defineProps<{
  initialProvider: ModelProviderType;
}>();

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  add: [model: Model];
}>();

const providers = Object.values(ModelProvider).map((p) => ({
  label: p,
  value: p,
}));

const name = ref("");
const id = ref("");
const isReasoningModel = ref(false);
const provider = ref<ModelProviderType>(initialProvider);
const providerReasoningDisabledMessage = computed(() => {
  return getProviderReasoningDisabledMessage(provider.value);
});

const canSave = () => name.value.trim() !== "" && id.value.trim() !== "";

const resetForm = () => {
  name.value = "";
  id.value = "";
  isReasoningModel.value = false;
  provider.value = initialProvider;
};

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

watch(provider, (nextProvider) => {
  if (getProviderReasoningDisabledMessage(nextProvider) !== undefined) {
    isReasoningModel.value = false;
  }
});

const handleSave = () => {
  if (!canSave()) return;

  emit("add", {
    name: name.value.trim(),
    id: id.value.trim(),
    provider: provider.value,
    capabilities: {
      reasoning: providerReasoningDisabledMessage.value === undefined && isReasoningModel.value,
    },
  });

  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Add Custom Model"
    :style="{ width: '30rem' }">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label
          for="provider"
          class="font-medium text-surface-200">
          Provider
        </label>
        <Dropdown
          id="provider"
          v-model="provider"
          :options="providers"
          option-label="label"
          option-value="value"
          class="w-full" />
      </div>
      <div class="flex flex-col gap-2">
        <label
          for="name"
          class="font-medium text-surface-200">
          Name
        </label>
        <InputText
          id="name"
          v-model="name"
          placeholder="Sonnet 4.6"
          class="w-full" />
      </div>
      <div class="flex flex-col gap-2">
        <label
          for="id"
          class="font-medium text-surface-200">
          Model ID
        </label>
        <InputText
          id="id"
          v-model="id"
          placeholder="anthropic/claude-sonnet-4.6"
          class="w-full" />
      </div>
      <div class="flex items-center gap-2">
        <Checkbox
          v-model="isReasoningModel"
          binary
          :disabled="providerReasoningDisabledMessage !== undefined"
          input-id="reasoning" />
        <label
          for="reasoning"
          :class="
            providerReasoningDisabledMessage === undefined ? 'text-surface-200' : 'text-surface-500'
          ">
          Is Reasoning Model
        </label>
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="handleCancel" />
      <Button
        label="Add"
        :disabled="!canSave()"
        @click="handleSave" />
    </template>
  </Dialog>
</template>
