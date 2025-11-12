<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Textarea from "primevue/textarea";
import { computed, ref, watch } from "vue";

import { useConfigStore } from "@/stores/config";

type LearningRow = {
  index: number;
  value: string;
};

const configStore = useConfigStore();

const learnings = computed(() => configStore.learnings);

const drafts = ref<string[]>([]);
watch(
  learnings,
  (next) => {
    drafts.value = [...next];
  },
  { immediate: true },
);

const rows = computed<LearningRow[]>(() =>
  drafts.value.map((value, index) => ({
    index,
    value,
  })),
);

const selectedRows = ref<LearningRow[]>([]);

const isRowSelected = (row: LearningRow) =>
  selectedRows.value.some((selected) => selected.index === row.index);

const allRowsSelected = computed(
  () => rows.value.length > 0 && rows.value.every(isRowSelected),
);

const toggleRowSelection = (row: LearningRow) => {
  if (isRowSelected(row)) {
    selectedRows.value = selectedRows.value.filter(
      (selected) => selected.index !== row.index,
    );
  } else {
    selectedRows.value = [...selectedRows.value, row];
  }
};

const toggleSelectAll = () => {
  if (allRowsSelected.value) {
    selectedRows.value = [];
  } else {
    selectedRows.value = [...rows.value];
  }
};
const isClearDisabled = computed(() => rows.value.length === 0);

const newLearning = ref("");
const addIsPending = ref(false);
const pendingRows = ref<number[]>([]);

const resetSelection = () => {
  selectedRows.value = [];
};

const markRowPending = (index: number) => {
  if (!pendingRows.value.includes(index)) {
    pendingRows.value = [...pendingRows.value, index];
  }
};

const unmarkRowPending = (index: number) => {
  if (pendingRows.value.includes(index)) {
    pendingRows.value = pendingRows.value.filter((value) => value !== index);
  }
};

const isRowPending = (index: number) => pendingRows.value.includes(index);

const commitLearning = async (index: number) => {
  const draft = drafts.value[index] ?? "";
  const original = learnings.value[index] ?? "";

  if (draft === original) {
    return;
  }

  markRowPending(index);
  try {
    await configStore.updateLearning(index, draft);
  } finally {
    unmarkRowPending(index);
  }
};

const handleEditorKeydown = async (event: KeyboardEvent, index: number) => {
  if (
    (event.key === "Enter" && event.metaKey) ||
    (event.key === "Enter" && event.ctrlKey)
  ) {
    event.preventDefault();
    await commitLearning(index);
  }
};

const handleNewLearningKeydown = (event: KeyboardEvent) => {
  if (
    (event.key === "Enter" && event.ctrlKey) ||
    (event.key === "Enter" && event.metaKey)
  ) {
    event.preventDefault();
    void handleAddLearning();
  }
};

const handleAddLearning = async () => {
  const value = newLearning.value;
  if (value.trim().length === 0) {
    return;
  }

  addIsPending.value = true;
  try {
    await configStore.addLearning(value);
    newLearning.value = "";
  } finally {
    addIsPending.value = false;
  }
};

const handleDeleteRow = async (index: number) => {
  await configStore.removeLearnings([index]);
  resetSelection();
};

const handleBulkDelete = async () => {
  if (selectedRows.value.length === 0) {
    return;
  }

  const indexes = selectedRows.value.map((row) => row.index);
  await configStore.removeLearnings(indexes);
  resetSelection();
};

const handleClearAll = async () => {
  if (rows.value.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to delete all learnings? This cannot be undone.",
  );
  if (!confirmed) {
    return;
  }

  await configStore.clearLearnings();
  resetSelection();
};
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden gap-4 p-4">
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold text-surface-100">Learnings</h2>
      <p class="text-sm text-surface-400">
        Manage project-scoped learnings to share durable insights, IDs, and
        notes with your agents.
      </p>
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="text-sm text-surface-400">
        {{ rows.length }} learning{{ rows.length === 1 ? "" : "s" }} stored for
        this project.
      </div>
      <div class="flex gap-2">
        <Button
          icon="fas fa-trash"
          label="Delete Selected"
          severity="danger"
          size="small"
          outlined
          :disabled="selectedRows.length === 0"
          @click="handleBulkDelete"
        />
        <Button
          icon="fas fa-broom"
          label="Clear All"
          severity="danger"
          size="small"
          outlined
          :disabled="isClearDisabled"
          @click="handleClearAll"
        />
      </div>
    </div>

    <div class="flex-1 max-h-[55vh] overflow-hidden">
      <div
        v-if="rows.length === 0"
        class="flex flex-col items-center justify-center h-full text-center gap-4 p-6 border border-dashed border-surface-700 rounded-lg"
      >
        <i class="fas fa-lightbulb text-4xl text-surface-300"></i>
        <div class="flex flex-col gap-1">
          <h3 class="text-base font-semibold text-surface-200">
            No learnings yet
          </h3>
          <p class="text-sm text-surface-400">
            Capture your first learning below to help the agents remember
            important context.
          </p>
        </div>
      </div>

      <DataTable
        v-else
        v-model:selection="selectedRows"
        :value="rows"
        :data-key="'index'"
        selection-mode="multiple"
        scrollable
        scroll-height="100%"
        striped-rows
        class="h-full w-full"
        :pt="{
          wrapper: { class: 'h-full w-full' },
          table: { class: 'h-full w-full align-top' },
        }"
      >
        <Column class="w-12">
          <template #header>
            <Checkbox
              binary
              :model-value="allRowsSelected"
              aria-label="Toggle select all learnings"
              @click.stop="toggleSelectAll"
            />
          </template>
          <template #body="{ data }">
            <Checkbox
              binary
              :model-value="isRowSelected(data)"
              :disabled="isRowPending(data.index)"
              aria-label="Toggle learning selection"
              @click.stop="toggleRowSelection(data)"
            />
          </template>
        </Column>
        <Column header="Learning" class="flex-1">
          <template #body="{ data }">
            <div class="flex flex-col gap-1">
              <Textarea
                v-model="drafts[data.index]"
                auto-resize
                rows="3"
                class="w-full text-sm"
                placeholder="Update learning..."
                :disabled="isRowPending(data.index)"
                @blur="commitLearning(data.index)"
                @keydown="handleEditorKeydown($event, data.index)"
              />
              <span class="text-xs text-surface-500">
                Press Ctrl+Enter (or Cmd+Enter) to save without leaving the
                field.
              </span>
            </div>
          </template>
        </Column>
        <Column header="Actions" class="w-16 text-right">
          <template #body="{ data }">
            <Button
              icon="fas fa-trash"
              severity="danger"
              size="small"
              text
              :disabled="isRowPending(data.index)"
              @click="handleDeleteRow(data.index)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <div class="flex flex-col gap-3 border border-surface-700 rounded-lg p-4">
      <label class="text-sm font-medium text-surface-200">Add Learning</label>
      <Textarea
        v-model="newLearning"
        auto-resize
        rows="4"
        placeholder="Paste IDs, tokens, URLs, or other durable notes here..."
        class="w-full"
        :disabled="addIsPending"
        @keydown="handleNewLearningKeydown"
      />
      <div class="flex justify-end">
        <Button
          icon="fas fa-plus"
          label="Add Learning"
          size="small"
          :loading="addIsPending"
          :disabled="newLearning.trim().length === 0 || addIsPending"
          @click="handleAddLearning"
        />
      </div>
    </div>
  </div>
</template>
