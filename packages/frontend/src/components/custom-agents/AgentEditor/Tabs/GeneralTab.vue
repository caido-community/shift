<script setup lang="ts">
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import type { SkillScope } from "shared";

const { scopeOptions } = defineProps<{
  scopeOptions: Array<{ label: string; value: SkillScope }>;
}>();

const name = defineModel<string>("name", { required: true });
const description = defineModel<string>("description", { required: true });
const scope = defineModel<SkillScope>("scope", { required: true });
</script>

<template>
  <div class="flex w-full flex-col gap-4 p-4">
    <div class="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
      <div class="flex flex-col gap-2">
        <label
          for="agent-name"
          class="text-base font-medium text-surface-200">
          Name
        </label>
        <InputText
          id="agent-name"
          v-model="name"
          placeholder="SQL Injection Tester"
          class="w-full" />
      </div>

      <div class="flex flex-col gap-2">
        <label
          for="agent-description"
          class="text-base font-medium text-surface-200">
          Description
        </label>
        <InputText
          id="agent-description"
          v-model="description"
          placeholder="Agent dedicated to finding SQL injection vulnerabilities"
          class="w-full" />
      </div>
    </div>

    <div class="flex w-full flex-col gap-2">
      <div class="flex flex-col gap-0">
        <label class="text-base font-medium text-surface-200">Availability</label>
        <p class="text-sm text-surface-400">Choose where this agent can be used.</p>
      </div>
      <SelectButton
        v-model="scope"
        :options="scopeOptions"
        option-label="label"
        option-value="value"
        class="w-full flex"
        :pt="{ button: { class: 'flex-1 w-full' } }" />
    </div>
  </div>
</template>
