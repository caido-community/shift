<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import SelectButton from "primevue/selectbutton";
import type { CreateCustomAgentInput, CustomAgent, UpdateCustomAgentInput } from "shared";
import { computed, ref, watch } from "vue";

import AutomationTab from "./Tabs/AutomationTab.vue";
import CapabilitiesTab from "./Tabs/CapabilitiesTab.vue";
import GeneralTab from "./Tabs/GeneralTab.vue";
import { useAgentEditorForm } from "./useAgentEditorForm";

const { agent = undefined } = defineProps<{
  agent?: CustomAgent;
}>();

const emit = defineEmits<{
  save: [input: CreateCustomAgentInput];
  update: [id: string, input: UpdateCustomAgentInput];
  cancel: [];
}>();

type AgentEditorTab = "general" | "capabilities" | "automation";

const tabOptions: Array<{ label: string; value: AgentEditorTab }> = [
  { label: "General", value: "general" },
  { label: "Capabilities", value: "capabilities" },
  { label: "Automation", value: "automation" },
];

const activeTab = ref<AgentEditorTab>("general");

const {
  name,
  description,
  instructions,
  scope,
  selectedSkillIds,
  selectedWorkflowIds,
  allWorkflowsEnabled,
  selectedBinaries,
  selectedCollections,
  formTitle,
  saveButtonLabel,
  canSave,
  scopeOptions,
  skillOptions,
  workflowOptions,
  collectionOptions,
  setSelectedCollections,
  buildSubmitResult,
} = useAgentEditorForm(() => agent);

const selectedCollectionsModel = computed({
  get: () => selectedCollections.value,
  set: setSelectedCollections,
});

watch(
  () => agent?.id,
  () => {
    activeTab.value = "general";
  },
  { immediate: true }
);

const handleCancel = () => {
  emit("cancel");
};

const handleSave = () => {
  const result = buildSubmitResult();
  if (result === undefined) {
    return;
  }

  if (result.kind === "create") {
    emit("save", result.input);
    return;
  }

  emit("update", result.id, result.input);
};
</script>

<template>
  <div class="flex h-full flex-col gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold">
            {{ formTitle }}
          </h2>
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
      class="h-fit"
      :pt:body="{ class: 'p-2' }">
      <template #content>
        <SelectButton
          v-model="activeTab"
          :options="tabOptions"
          option-label="label"
          option-value="value"
          class="w-full flex"
          :pt="{ button: { class: 'flex-1 w-full' } }" />
      </template>
    </Card>

    <Card
      class="h-full min-h-0"
      :pt:body="{ class: 'h-full p-0' }"
      :pt:content="{ class: 'h-full overflow-auto' }">
      <template #content>
        <div class="w-full">
          <GeneralTab
            v-if="activeTab === 'general'"
            v-model:name="name"
            v-model:description="description"
            v-model:scope="scope"
            :scope-options="scopeOptions" />

          <CapabilitiesTab
            v-else-if="activeTab === 'capabilities'"
            v-model:selected-skill-ids="selectedSkillIds"
            v-model:all-workflows-enabled="allWorkflowsEnabled"
            v-model:selected-workflow-ids="selectedWorkflowIds"
            v-model:instructions="instructions"
            v-model:binaries="selectedBinaries"
            :skill-options="skillOptions"
            :workflow-options="workflowOptions" />

          <AutomationTab
            v-else
            v-model:selected-collections="selectedCollectionsModel"
            :collection-options="collectionOptions" />
        </div>
      </template>
    </Card>
  </div>
</template>
