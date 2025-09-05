<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";

import { useForm } from "./useForm";

const {
  customPrompts,
  showDialog,
  editingPrompt,
  promptTitle,
  promptContent,
  gistUrl,
  isGistMode,
  isLoadingGist,
  openEditDialog,
  openCreateDialog,
  closeDialog,
  savePrompt,
  deletePrompt,
  handleGistUrlChange,
  refreshGist,
} = useForm();
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex-1 overflow-hidden">
      <div
        v-if="customPrompts.length === 0"
        class="flex flex-col items-center justify-center h-full text-center gap-4 p-4"
      >
        <i class="fas fa-message text-4xl text-surface-200"></i>
        <div class="flex flex-col">
          <h5 class="text-lg font-medium text-surface-400">
            No Custom Prompts
          </h5>
          <p class="text-sm text-surface-500">
            Create your first custom prompt to get started
          </p>
        </div>
      </div>

      <div v-else class="h-full overflow-hidden w-full">
        <DataTable
          :value="customPrompts"
          scrollable
          scroll-height="100%"
          striped-rows
          class="h-full w-full"
          :pt="{
            wrapper: { class: 'h-full w-full' },
            table: { class: 'h-full w-full' },
          }"
        >
          <Column field="title" header="Title" class="w-1/4">
            <template #body="{ data }">
              <div class="flex items-center gap-2">
                <span class="font-medium text-surface-100">{{
                  data.title
                }}</span>
                <span
                  v-if="data.isDefault"
                  class="text-xs bg-surface-700 text-surface-300 px-2 py-1 rounded"
                  >Default</span
                >
                <span
                  v-if="data.gistUrl"
                  class="text-xs bg-blue-700 text-blue-300 px-2 py-1 rounded"
                  >Gist</span
                >
              </div>
            </template>
          </Column>
          <Column field="content" header="Content" class="flex-1">
            <template #body="{ data }">
              <span class="text-sm text-surface-300">
                {{ data.content.substring(0, 100)
                }}{{ data.content.length > 100 ? "..." : "" }}
              </span>
            </template>
          </Column>
          <Column header="Actions" class="w-40">
            <template #body="{ data }">
              <div class="flex gap-2 justify-end">
                <Button
                  v-if="data.gistUrl"
                  icon="fas fa-sync-alt"
                  size="small"
                  severity="info"
                  outlined
                  :disabled="data.isDefault || isLoadingGist"
                  @click="refreshGist(data)"
                  title="Refresh from Gist"
                />
                <Button
                  icon="fas fa-edit"
                  size="small"
                  severity="secondary"
                  outlined
                  :disabled="data.isDefault"
                  @click="openEditDialog(data)"
                />
                <Button
                  icon="fas fa-trash"
                  size="small"
                  severity="danger"
                  outlined
                  :disabled="data.isDefault"
                  @click="deletePrompt(data.id, data.isDefault)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <div class="h-10 w-full flex justify-end items-center p-4">
      <Button
        icon="fas fa-plus"
        label="Add Prompt"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <Dialog
      v-model:visible="showDialog"
      :header="editingPrompt ? 'Edit Prompt' : 'Add New Prompt'"
      modal
      :draggable="false"
      class="w-[600px]"
      :pt="{
        content: { class: 'pb-6' },
        header: { style: { border: 'none', padding: '1rem 1.5rem' } },
        root: { style: { border: 'none' } },
      }"
    >
      <div class="flex flex-col gap-4 px-6">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">GitHub Gist URL (Optional)</label>
          <InputText
            v-model="gistUrl"
            placeholder="https://gist.github.com/username/gist-id"
            class="w-full"
            @blur="handleGistUrlChange"
          />
          <p class="text-xs text-surface-500">
            Paste a GitHub Gist URL to automatically load title and content
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">
            Title
            <span v-if="isGistMode" class="text-xs text-surface-500 ml-2">(from Gist)</span>
          </label>
          <InputText
            v-model="promptTitle"
            placeholder="Enter prompt title"
            class="w-full"
            :readonly="isGistMode"
            :class="{ 'opacity-60': isGistMode }"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">
            Content
            <span v-if="isGistMode" class="text-xs text-surface-500 ml-2">(from Gist)</span>
          </label>
          <Textarea
            v-model="promptContent"
            placeholder="Enter prompt content"
            rows="8"
            class="w-full"
            :readonly="isGistMode"
            :class="{ 'opacity-60': isGistMode }"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button
            label="Cancel"
            severity="secondary"
            size="small"
            outlined
            @click="closeDialog"
          />
          <Button
            :label="isLoadingGist ? 'Loading...' : 'Save'"
            :disabled="promptTitle.trim() === '' || promptContent.trim() === '' || isLoadingGist"
            :loading="isLoadingGist"
            size="small"
            @click="savePrompt"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
