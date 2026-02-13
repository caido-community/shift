<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import Tooltip from "primevue/tooltip";
import { computed } from "vue";

import AgentForm from "./AgentForm.vue";
import { useCustomAgents } from "./useCustomAgents";

const {
  definitions,
  isLoading,
  view,
  editingAgent,
  openAddView,
  openEditView,
  closeForm,
  handleAdd,
  handleUpdate,
  handleDelete,
} = useCustomAgents();

const vTooltip = Tooltip;
const isFormVisible = computed(() => view.value !== "list");
const activeAgent = computed(() => (view.value === "edit" ? editingAgent.value : undefined));

const availabilitySeverityByScope = {
  global: "success",
  project: "warn",
} as const;

const getAvailabilitySeverity = (scope: "global" | "project") => {
  return availabilitySeverityByScope[scope];
};
</script>

<template>
  <AgentForm
    v-if="isFormVisible"
    :agent="activeAgent"
    @save="handleAdd"
    @update="handleUpdate"
    @cancel="closeForm" />

  <div
    v-else
    class="flex flex-col h-full gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold">Agents</h2>
            <p class="text-sm text-surface-400">
              Create custom agents with bundled skills, workflows, binaries, and instructions.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              label="Add Agent"
              icon="fas fa-plus"
              size="small"
              @click="openAddView" />
          </div>
        </div>
      </template>
    </Card>

    <Card
      class="h-full min-h-0"
      :pt:body="{ class: 'h-full p-0' }"
      :pt:content="{ class: 'h-full overflow-hidden' }">
      <template #content>
        <div
          v-if="isLoading"
          class="flex items-center justify-center h-full">
          <i class="fas fa-spinner fa-spin text-2xl text-surface-400"></i>
        </div>

        <div
          v-else-if="definitions.length === 0"
          class="flex flex-col items-center justify-center h-full text-center gap-4">
          <i class="fas fa-robot text-4xl text-surface-300"></i>
          <div class="flex flex-col gap-1">
            <h3 class="text-base font-semibold text-surface-200">No Agents</h3>
            <p class="text-sm text-surface-400">
              Create your first agent to bundle skills and workflows together.
            </p>
          </div>
        </div>

        <DataTable
          v-else
          :value="definitions"
          data-key="id"
          scrollable
          scroll-height="flex"
          striped-rows
          class="h-full w-full"
          :pt:wrapper="{ class: 'h-full w-full' }"
          :pt:table="{ class: 'w-full align-top' }"
          :pt:tbody="{ class: 'align-top' }">
          <Column
            field="name"
            header="Name">
            <template #body="{ data }">
              <div class="flex flex-col gap-0.5">
                <span class="font-medium">{{ data.name }}</span>
                <span
                  v-if="data.description"
                  class="text-xs text-surface-400">
                  {{ data.description }}
                </span>
              </div>
            </template>
          </Column>
          <Column
            header="Skills"
            style="width: 80px">
            <template #body="{ data }">
              <span class="text-sm text-surface-400">{{ data.skillIds.length }}</span>
            </template>
          </Column>
          <Column
            header="Workflows"
            style="width: 100px">
            <template #body="{ data }">
              <span class="text-sm text-surface-400">
                {{ data.allowedWorkflowIds === undefined ? "All" : data.allowedWorkflowIds.length }}
              </span>
            </template>
          </Column>
          <Column
            header="Binaries"
            style="width: 90px">
            <template #body="{ data }">
              <span class="text-sm text-surface-400">
                {{ data.allowedBinaries?.length ?? 0 }}
              </span>
            </template>
          </Column>
          <Column
            field="scope"
            header="Availability"
            style="width: 100px">
            <template #body="{ data }">
              <Tag
                :value="data.scope === 'global' ? 'Global' : 'Project'"
                :severity="getAvailabilitySeverity(data.scope)" />
            </template>
          </Column>
          <Column
            header="Actions"
            style="width: 100px">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-1">
                <Button
                  v-tooltip.top="'Edit agent'"
                  icon="fas fa-edit"
                  severity="secondary"
                  size="small"
                  text
                  @click="openEditView(data)" />
                <Button
                  v-tooltip.left="'Delete agent'"
                  icon="fas fa-trash"
                  severity="danger"
                  size="small"
                  text
                  @click="handleDelete(data.id)" />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
