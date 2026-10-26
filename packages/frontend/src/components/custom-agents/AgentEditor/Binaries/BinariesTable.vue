<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { computed, ref } from "vue";

import type { AgentEditorBinary } from "../useAgentEditorForm";

import BinaryDialog from "./BinaryDialog.vue";

const binaries = defineModel<AgentEditorBinary[]>("binaries", { required: true });

const isDialogVisible = ref(false);
const editingBinary = ref<AgentEditorBinary>();
const existingPaths = computed(() => binaries.value.map((binary) => binary.path));

const openDialog = (binary?: AgentEditorBinary) => {
  editingBinary.value = binary;
  isDialogVisible.value = true;
};

const handleDeleteBinary = (path: string) => {
  binaries.value = binaries.value.filter((binary) => binary.path !== path);
};

const handleSaveBinary = (binary: AgentEditorBinary) => {
  const originalPath = editingBinary.value?.path;
  binaries.value =
    originalPath === undefined
      ? [...binaries.value, binary]
      : binaries.value.map((item) => (item.path === originalPath ? binary : item));
};
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <div class="flex items-center justify-between px-4">
      <div class="flex flex-col gap-0">
        <span class="text-base font-medium text-surface-200">Whitelisted Binaries</span>
        <p class="text-sm text-surface-400">Allowlisted executables for binary tools.</p>
      </div>
      <Button
        label="Add Binary"
        icon="fas fa-plus"
        size="small"
        @click="openDialog()" />
    </div>

    <DataTable
      :value="binaries"
      data-key="path"
      striped-rows
      class="w-full"
      :pt:table="{ class: 'w-full align-top' }"
      :pt:tbody="{ class: 'align-top' }">
      <Column
        field="path"
        header="Path">
        <template #body="{ data }">
          <span class="font-mono text-xs text-surface-300">
            {{ data.path }}
          </span>
        </template>
      </Column>
      <Column header="Instructions">
        <template #body="{ data }">
          <span
            v-if="data.instructions !== ''"
            class="text-sm text-surface-400">
            {{ data.instructions }}
          </span>
          <span
            v-else
            class="text-sm italic text-surface-500">
            No instructions
          </span>
        </template>
      </Column>
      <Column
        header="Actions"
        style="width: 110px">
        <template #body="{ data }">
          <div class="flex items-center justify-end gap-1">
            <Button
              v-tooltip.top="'Edit binary'"
              icon="fas fa-edit"
              severity="secondary"
              text
              size="small"
              @click="openDialog(data)" />
            <Button
              v-tooltip.left="'Remove binary'"
              icon="fas fa-trash"
              severity="danger"
              text
              size="small"
              @click="handleDeleteBinary(data.path)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <BinaryDialog
    v-model:visible="isDialogVisible"
    :binary="editingBinary"
    :existing-paths="existingPaths"
    @save="handleSaveBinary" />
</template>
