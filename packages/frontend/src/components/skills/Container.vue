<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import Tooltip from "primevue/tooltip";

import { AddSkillDialog } from "./AddSkillDialog";
import { EditSkillDialog } from "./EditSkillDialog";
import { useSkills } from "./useSkills";

const {
  definitions,
  isLoading,
  isAddDialogVisible,
  isEditDialogVisible,
  editingSkill,
  isRefreshing,
  openAddDialog,
  openEditDialog,
  closeEditDialog,
  handleAddStatic,
  handleAddDynamic,
  handleUpdateStatic,
  handleUpdateDynamic,
  handleUpdateProjectOverride,
  handleDelete,
  handleRefresh,
  getSkillContent,
} = useSkills();

const vTooltip = Tooltip;

const getTypeSeverity = (type: "static" | "dynamic") => {
  return type === "static" ? "secondary" : "info";
};

const getScopeSeverity = (scope: "global" | "project") => {
  return scope === "global" ? "success" : "warn";
};
</script>

<template>
  <div class="flex flex-col h-full gap-1">
    <Card
      class="h-fit"
      :pt:body="{ class: 'p-4' }">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold">Skills</h2>
            <p class="text-sm text-surface-400">
              Provide specialized knowledge to your custom agents.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              v-tooltip.top="'Refresh dynamic skills'"
              icon="fas fa-sync-alt"
              severity="secondary"
              size="small"
              label="Refresh"
              :loading="isRefreshing"
              @click="handleRefresh" />
            <Button
              label="Add Skill"
              icon="fas fa-plus"
              size="small"
              @click="openAddDialog" />
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
          <i class="fas fa-book text-4xl text-surface-300"></i>
          <div class="flex flex-col gap-1">
            <h3 class="text-base font-semibold text-surface-200">No Skills</h3>
            <p class="text-sm text-surface-400">
              Create your first skill to enhance agent capabilities.
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
            field="title"
            header="Name">
            <template #body="{ data }">
              <span class="font-medium">{{ data.title }}</span>
            </template>
          </Column>
          <Column
            field="type"
            header="Type"
            style="width: 100px">
            <template #body="{ data }">
              <Tag
                :value="data.type === 'static' ? 'Static' : 'Dynamic'"
                :severity="getTypeSeverity(data.type)" />
            </template>
          </Column>
          <Column
            field="scope"
            header="Scope"
            style="width: 100px">
            <template #body="{ data }">
              <Tag
                :value="data.scope === 'global' ? 'Global' : 'Project'"
                :severity="getScopeSeverity(data.scope)" />
            </template>
          </Column>
          <Column header="Source">
            <template #body="{ data }">
              <span
                v-if="data.type === 'dynamic'"
                class="text-sm text-surface-400">
                {{ data.url }}
              </span>
              <span
                v-else
                class="text-sm text-surface-500 italic">
                Static content
              </span>
            </template>
          </Column>
          <Column
            header="Actions"
            style="width: 100px">
            <template #body="{ data }">
              <div class="flex items-center justify-end gap-1">
                <Button
                  v-tooltip.top="'Edit skill'"
                  icon="fas fa-edit"
                  severity="secondary"
                  size="small"
                  text
                  @click="openEditDialog(data)" />
                <Button
                  v-tooltip.left="'Delete skill'"
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

    <AddSkillDialog
      v-model:visible="isAddDialogVisible"
      @add-static="handleAddStatic"
      @add-dynamic="handleAddDynamic" />

    <EditSkillDialog
      v-model:visible="isEditDialogVisible"
      :skill="editingSkill"
      :skill-content="editingSkill !== undefined ? getSkillContent(editingSkill.id) : ''"
      @update-static="handleUpdateStatic"
      @update-dynamic="handleUpdateDynamic"
      @update-project-override="handleUpdateProjectOverride"
      @update:visible="!$event && closeEditDialog()" />
  </div>
</template>
