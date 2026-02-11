<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import SelectButton from "primevue/selectbutton";
import Textarea from "primevue/textarea";
import type {
  CreateCustomAgentInput,
  CustomAgent,
  SkillScope,
  UpdateCustomAgentInput,
} from "shared";
import { computed, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useSkillsStore } from "@/stores/skills";

const sdk = useSDK();
const skillsStore = useSkillsStore();

const { agent = undefined } = defineProps<{
  agent?: CustomAgent;
}>();

const emit = defineEmits<{
  save: [input: CreateCustomAgentInput];
  update: [id: string, input: UpdateCustomAgentInput];
  cancel: [];
}>();

const isEditing = computed(() => agent !== undefined);

const scopeOptions = [
  { label: "Project", value: "project" },
  { label: "Global", value: "global" },
];

const name = ref("");
const description = ref("");
const instructions = ref("");
const scope = ref<SkillScope>("project");
const selectedSkillIds = ref<string[]>([]);
const selectedWorkflowIds = ref<string[]>([]);
const allWorkflowsEnabled = ref(true);
const selectedCollections = ref<string[]>([]);

const skillOptions = computed(() =>
  skillsStore.definitions.map((d) => ({
    label: d.title,
    value: d.id,
  }))
);

const workflowOptions = computed(() =>
  sdk.workflows
    .getWorkflows()
    .filter((w) => w.kind === "Convert")
    .map((w) => ({
      label: w.name,
      value: w.id,
    }))
);

const collectionOptions = computed(() =>
  sdk.replay.getCollections().map((c) => ({
    label: c.name,
    value: c.name,
  }))
);

const canSave = computed(() => name.value.trim() !== "");

watch(
  () => agent,
  (newAgent) => {
    if (newAgent !== undefined) {
      name.value = newAgent.name;
      description.value = newAgent.description;
      instructions.value = newAgent.instructions;
      scope.value = newAgent.scope;
      selectedSkillIds.value = [...newAgent.skillIds];
      allWorkflowsEnabled.value = newAgent.allowedWorkflowIds === undefined;
      selectedWorkflowIds.value = newAgent.allowedWorkflowIds ?? [];
      selectedCollections.value = [...newAgent.boundCollections];
    } else {
      name.value = "";
      description.value = "";
      instructions.value = "";
      scope.value = "project";
      selectedSkillIds.value = [];
      selectedWorkflowIds.value = [];
      allWorkflowsEnabled.value = true;
      selectedCollections.value = [];
    }
  },
  { immediate: true }
);

const handleSave = () => {
  if (!canSave.value) return;

  if (agent !== undefined) {
    emit("update", agent.id, {
      name: name.value.trim(),
      description: description.value.trim(),
      instructions: instructions.value.trim(),
      scope: scope.value,
      skillIds: selectedSkillIds.value,
      allowedWorkflowIds: allWorkflowsEnabled.value ? null : selectedWorkflowIds.value,
      boundCollections: selectedCollections.value,
    });
  } else {
    emit("save", {
      name: name.value.trim(),
      description: description.value.trim(),
      instructions: instructions.value.trim(),
      scope: scope.value,
      skillIds: selectedSkillIds.value,
      allowedWorkflowIds: allWorkflowsEnabled.value ? undefined : selectedWorkflowIds.value,
      boundCollections: selectedCollections.value,
    });
  }
};
</script>

<template>
  <div class="flex flex-col h-full gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <Button
              icon="fas fa-arrow-left"
              severity="secondary"
              text
              size="small"
              @click="emit('cancel')" />
            <h2 class="text-base font-bold">
              {{ isEditing ? "Edit Agent" : "New Agent" }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              size="small"
              @click="emit('cancel')" />
            <Button
              :label="isEditing ? 'Save' : 'Create'"
              size="small"
              :disabled="!canSave"
              @click="handleSave" />
          </div>
        </div>
      </template>
    </Card>

    <Card
      class="h-full min-h-0"
      :pt:body="{ class: 'h-full p-0' }"
      :pt:content="{ class: 'h-full overflow-auto' }">
      <template #content>
        <div class="flex flex-col gap-6 p-6 max-w-2xl">
          <div class="flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-surface-400 uppercase tracking-wider">General</h3>

            <div class="flex flex-col gap-2">
              <label
                for="agent-name"
                class="text-sm font-medium text-surface-200">
                Name
              </label>
              <InputText
                id="agent-name"
                v-model="name"
                placeholder="e.g. SQL Injection Tester"
                class="w-full" />
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="agent-description"
                class="text-sm font-medium text-surface-200">
                Description
              </label>
              <InputText
                id="agent-description"
                v-model="description"
                placeholder="Brief description of what this agent does..."
                class="w-full" />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-surface-200">Availability</label>
              <SelectButton
                v-model="scope"
                :options="scopeOptions"
                option-label="label"
                option-value="value"
                class="w-full flex"
                :pt="{ button: { class: 'flex-1 w-full' } }" />
              <p class="text-xs text-surface-400">
                {{
                  scope === "project"
                    ? "Available only in the current project"
                    : "Available across all projects"
                }}
              </p>
            </div>
          </div>

          <div class="border-t border-surface-700" />

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <h3 class="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                Capabilities
              </h3>
              <p class="text-xs text-surface-500">
                Expand agent capabilities by adding custom tools, instructions, or skills.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-surface-200">Skills</label>
              <MultiSelect
                v-model="selectedSkillIds"
                :options="skillOptions"
                option-label="label"
                option-value="value"
                placeholder="Select skills..."
                class="w-full" />
              <p class="text-xs text-surface-400">
                Skills provide domain-specific knowledge and context to the agent.
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-surface-200">Convert Workflows</label>
              <div class="flex items-center gap-2">
                <Checkbox
                  v-model="allWorkflowsEnabled"
                  input-id="all-workflows"
                  :binary="true" />
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
              <p class="text-xs text-surface-400">
                {{
                  allWorkflowsEnabled
                    ? "Agent can use any available convert workflow as a tool."
                    : "Agent can only use the selected convert workflows."
                }}
              </p>
            </div>

            <div class="flex flex-col gap-2">
              <label
                for="agent-instructions"
                class="text-sm font-medium text-surface-200">
                Custom Instructions
              </label>
              <Textarea
                id="agent-instructions"
                v-model="instructions"
                placeholder="Add specific instructions for this agent..."
                rows="5"
                class="w-full font-mono text-sm" />
              <p class="text-xs text-surface-400">
                Provide custom guidelines that shape how this agent behaves and responds.
              </p>
            </div>
          </div>

          <div class="border-t border-surface-700" />

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1">
              <h3 class="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                Automation
              </h3>
              <p class="text-xs text-surface-500">Configure automatic triggers for this agent.</p>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-surface-200">Bound Collections</label>
              <MultiSelect
                v-model="selectedCollections"
                :options="collectionOptions"
                option-label="label"
                option-value="value"
                placeholder="Select collections..."
                class="w-full" />
              <p class="text-xs text-surface-400">
                Agent will auto-launch when a request is sent to these replay collections.
              </p>
            </div>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
