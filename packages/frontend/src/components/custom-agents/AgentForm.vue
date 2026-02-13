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
  CustomAgentBinary,
  SkillScope,
  UpdateCustomAgentInput,
} from "shared";
import { computed, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useSkillsStore } from "@/stores/skills";

const sdk = useSDK();
const skillsStore = useSkillsStore();
const customAgentsStore = useCustomAgentsStore();

const { agent = undefined } = defineProps<{
  agent?: CustomAgent;
}>();

const emit = defineEmits<{
  save: [input: CreateCustomAgentInput];
  update: [id: string, input: UpdateCustomAgentInput];
  cancel: [];
}>();

const scopeOptions: Array<{ label: string; value: SkillScope }> = [
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
const selectedBinaries = ref<Array<{ path: string; instructions: string }>>([]);
const binaryPathInput = ref("");
const binaryInstructionsInput = ref("");
const selectedCollections = ref<string[]>([]);

const isEditing = computed(() => agent !== undefined);
const formTitle = computed(() => (isEditing.value ? "Edit Agent" : "New Agent"));
const saveButtonLabel = computed(() => (isEditing.value ? "Save" : "Create"));

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

const occupiedCollectionOwners = computed(() => {
  const occupied = new Map<string, string>();
  for (const definition of customAgentsStore.definitions) {
    if (agent !== undefined && definition.id === agent.id) {
      continue;
    }
    for (const collectionName of definition.boundCollections) {
      if (!occupied.has(collectionName)) {
        occupied.set(collectionName, definition.name);
      }
    }
  }
  return occupied;
});

const conflictingCollections = computed(() =>
  selectedCollections.value.filter((collectionName) =>
    occupiedCollectionOwners.value.has(collectionName)
  )
);

const availabilityDescription = computed(() =>
  scope.value === "project"
    ? "Available only in the current project"
    : "Available across all projects"
);

const workflowDescription = computed(() =>
  allWorkflowsEnabled.value
    ? "Agent can use any available convert workflow as a tool."
    : "Agent can only use the selected convert workflows."
);

const binarySummary = computed(() => {
  const count = selectedBinaries.value.length;
  return count === 0
    ? "No binaries whitelisted. Binary execution will be blocked."
    : `${count} binaries whitelisted.`;
});

const canSave = computed(() => name.value.trim() !== "");
const trimmedBinaryPathInput = computed(() => binaryPathInput.value.trim());
const canAddBinaryPath = computed(() => {
  const value = trimmedBinaryPathInput.value;
  return value !== "" && !selectedBinaries.value.some((binary) => binary.path === value);
});

const resetForm = () => {
  name.value = "";
  description.value = "";
  instructions.value = "";
  scope.value = "project";
  selectedSkillIds.value = [];
  selectedWorkflowIds.value = [];
  allWorkflowsEnabled.value = true;
  selectedBinaries.value = [];
  binaryPathInput.value = "";
  binaryInstructionsInput.value = "";
  selectedCollections.value = [];
};

const applyAgentToForm = (agent: CustomAgent) => {
  name.value = agent.name;
  description.value = agent.description;
  instructions.value = agent.instructions;
  scope.value = agent.scope;
  selectedSkillIds.value = [...agent.skillIds];
  allWorkflowsEnabled.value = agent.allowedWorkflowIds === undefined;
  selectedWorkflowIds.value = agent.allowedWorkflowIds ?? [];
  selectedBinaries.value = (agent.allowedBinaries ?? []).map((binary) => ({
    path: binary.path,
    instructions: binary.instructions ?? "",
  }));
  binaryPathInput.value = "";
  binaryInstructionsInput.value = "";
  selectedCollections.value = [...agent.boundCollections];
};

watch(
  () => agent,
  (newAgent) => {
    if (newAgent === undefined) {
      resetForm();
      return;
    }

    applyAgentToForm(newAgent);
  },
  { immediate: true }
);

const addBinaryPath = () => {
  const path = trimmedBinaryPathInput.value;
  if (path === "" || selectedBinaries.value.some((binary) => binary.path === path)) {
    return;
  }

  const instructions = binaryInstructionsInput.value.trim();
  selectedBinaries.value = [...selectedBinaries.value, { path, instructions }];
  binaryPathInput.value = "";
  binaryInstructionsInput.value = "";
};

const removeBinaryPath = (binaryPath: string) => {
  selectedBinaries.value = selectedBinaries.value.filter((binary) => binary.path !== binaryPath);
};

const showCollectionConflict = (collectionName: string) => {
  const owner = occupiedCollectionOwners.value.get(collectionName);
  const message =
    owner === undefined
      ? `Collection "${collectionName}" is already bound to another agent`
      : `Collection "${collectionName}" is already bound to "${owner}"`;
  sdk.window.showToast(message, { variant: "error" });
};

const handleCollectionChange = (value: string[]) => {
  const added = value.find(
    (collectionName) =>
      !selectedCollections.value.includes(collectionName) &&
      occupiedCollectionOwners.value.has(collectionName)
  );

  if (added !== undefined) {
    showCollectionConflict(added);
    return;
  }

  selectedCollections.value = value;
};

const buildBaseInput = () => ({
  name: name.value.trim(),
  description: description.value.trim(),
  instructions: instructions.value.trim(),
  scope: scope.value,
  skillIds: [...selectedSkillIds.value],
  boundCollections: [...selectedCollections.value],
});

const handleSave = () => {
  if (!canSave.value) return;

  const firstConflict = conflictingCollections.value[0];
  if (firstConflict !== undefined) {
    showCollectionConflict(firstConflict);
    return;
  }

  const baseInput = buildBaseInput();
  const allowedWorkflowIds = [...selectedWorkflowIds.value];
  const allowedBinaries: CustomAgentBinary[] = selectedBinaries.value
    .map((binary) => {
      const path = binary.path.trim();
      const trimmedInstructions = binary.instructions.trim();
      return {
        path,
        instructions: trimmedInstructions === "" ? undefined : trimmedInstructions,
      };
    })
    .filter((binary) => binary.path !== "");

  if (agent !== undefined) {
    emit("update", agent.id, {
      ...baseInput,
      allowedWorkflowIds: allWorkflowsEnabled.value ? null : allowedWorkflowIds,
      allowedBinaries: allowedBinaries.length === 0 ? null : allowedBinaries,
    });
    return;
  }

  emit("save", {
    ...baseInput,
    allowedWorkflowIds: allWorkflowsEnabled.value ? undefined : allowedWorkflowIds,
    allowedBinaries: allowedBinaries.length === 0 ? undefined : allowedBinaries,
  });
};

const handleCancel = () => {
  emit("cancel");
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
              @click="handleCancel" />
            <h2 class="text-base font-bold">
              {{ formTitle }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              size="small"
              @click="handleCancel" />
            <Button
              :label="saveButtonLabel"
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
                {{ availabilityDescription }}
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
                {{ workflowDescription }}
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

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-surface-200">Whitelisted Binaries</label>
              <div class="flex items-center gap-2">
                <InputText
                  v-model="binaryPathInput"
                  placeholder="/Users/you/bin/ffuf"
                  class="w-full font-mono text-xs"
                  @keydown.enter.prevent="addBinaryPath" />
                <Button
                  label="Add"
                  size="small"
                  :disabled="!canAddBinaryPath"
                  @click="addBinaryPath" />
              </div>
              <Textarea
                v-model="binaryInstructionsInput"
                placeholder="Optional instructions for this binary (usage, argument patterns, output interpretation)..."
                rows="3"
                class="w-full font-mono text-xs" />
              <div
                v-if="selectedBinaries.length > 0"
                class="flex flex-col gap-1 rounded-md border border-surface-700 bg-surface-800/40 p-2">
                <div
                  v-for="binary in selectedBinaries"
                  :key="binary.path"
                  class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <span class="block truncate font-mono text-xs text-surface-300">
                      {{ binary.path }}
                    </span>
                    <Textarea
                      v-model="binary.instructions"
                      placeholder="Optional instructions for this binary..."
                      rows="2"
                      class="mt-2 w-full font-mono text-xs" />
                  </div>
                  <Button
                    icon="fas fa-times"
                    severity="secondary"
                    text
                    size="small"
                    @click="removeBinaryPath(binary.path)" />
                </div>
              </div>
              <p class="text-xs text-surface-400">
                {{ binarySummary }}
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
                :model-value="selectedCollections"
                :options="collectionOptions"
                option-label="label"
                option-value="value"
                placeholder="Select collections..."
                class="w-full"
                @update:model-value="handleCollectionChange" />
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
