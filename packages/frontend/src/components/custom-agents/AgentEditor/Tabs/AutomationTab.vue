<script setup lang="ts">
import MultiSelect from "primevue/multiselect";

const { collectionOptions } = defineProps<{
  collectionOptions: Array<{ label: string; value: string }>;
}>();

const selectedCollections = defineModel<string[]>("selectedCollections", { required: true });
</script>

<template>
  <div class="flex w-full flex-col gap-2 p-4">
    <div class="flex flex-col gap-0">
      <label class="text-base font-medium text-surface-200">Bound Collections</label>
      <p class="text-sm text-surface-400">
        Auto-launch this agent for selected replay collections.
      </p>
    </div>
    <MultiSelect
      v-model="selectedCollections"
      :options="collectionOptions"
      option-label="label"
      option-value="value"
      placeholder="Select collections..."
      class="w-full" />
  </div>
</template>
