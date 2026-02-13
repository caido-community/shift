<script setup lang="ts">
import Checkbox from "primevue/checkbox";
import MultiSelect from "primevue/multiselect";
import Textarea from "primevue/textarea";

import BinariesTable from "../Binaries/BinariesTable.vue";
import type { AgentEditorBinary } from "../useAgentEditorForm";

const { skillOptions, workflowOptions } = defineProps<{
  skillOptions: Array<{ label: string; value: string }>;
  workflowOptions: Array<{ label: string; value: string }>;
}>();

const selectedSkillIds = defineModel<string[]>("selectedSkillIds", { required: true });
const allWorkflowsEnabled = defineModel<boolean>("allWorkflowsEnabled", { required: true });
const selectedWorkflowIds = defineModel<string[]>("selectedWorkflowIds", { required: true });
const instructions = defineModel<string>("instructions", { required: true });
const binaries = defineModel<AgentEditorBinary[]>("binaries", { required: true });

const handleAllWorkflowsChange = (value: boolean) => {
  allWorkflowsEnabled.value = value;
  if (value) {
    selectedWorkflowIds.value = [];
  }
};
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="flex w-full flex-col gap-4 p-4">
      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-0">
          <label class="text-base font-medium text-surface-200">Skills</label>
          <p class="text-sm text-surface-400">Select reusable skill definitions.</p>
        </div>
        <MultiSelect
          v-model="selectedSkillIds"
          :options="skillOptions"
          option-label="label"
          option-value="value"
          placeholder="Select skills..."
          class="w-full" />
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex flex-col gap-0">
          <label class="text-base font-medium text-surface-200">Convert Workflows</label>
          <p class="text-sm text-surface-400">Limit convert tools available to this agent.</p>
        </div>
        <div class="flex items-center gap-2">
          <Checkbox
            input-id="all-workflows"
            :model-value="allWorkflowsEnabled"
            :binary="true"
            @update:model-value="handleAllWorkflowsChange" />
          <label
            for="all-workflows"
            class="text-sm text-surface-300">
            Allow access to all convert workflows
          </label>
        </div>
        <MultiSelect
          v-if="!allWorkflowsEnabled"
          v-model="selectedWorkflowIds"
          :options="workflowOptions"
          option-label="label"
          option-value="value"
          placeholder="Select allowed workflows..."
          class="w-full" />
      </div>

      <div class="flex w-full flex-col gap-2">
        <div class="flex flex-col gap-0">
          <label
            for="agent-instructions"
            class="text-base font-medium text-surface-200">
            Custom Instructions
          </label>
          <p class="text-sm text-surface-400">Extra guidance appended to the agent prompt.</p>
        </div>
        <Textarea
          id="agent-instructions"
          v-model="instructions"
          placeholder="Add specific instructions for this agent..."
          rows="8"
          class="w-full font-mono text-sm" />
      </div>
    </div>

    <BinariesTable v-model:binaries="binaries" />
  </div>
</template>
