<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Popover from "primevue/popover";
import { ref } from "vue";

import type { LaunchDialogProps } from "./types";
import { useLaunchDialog } from "./useLaunchDialog";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";

const { onConfirm, onCancel } = defineProps<LaunchDialogProps>();

const {
  entries,
  instructions,
  maxIterations,
  selectedModel,
  availableModels,
  skillOptions,
  isSkillSelected,
  toggleSkill,
  addEmptyEntry,
  removeEntry,
  handleConfirm,
  handleCancel,
  handleMaxIterationsInput,
  handleSelectionsKeydown,
} = useLaunchDialog({
  onConfirm,
  onCancel,
});

const skillsPopoverRef = ref<InstanceType<typeof Popover>>();
const onToggleSkillsPopover = (event: MouseEvent) => {
  skillsPopoverRef.value?.toggle(event);
};
</script>

<template>
  <div class="flex w-[520px] flex-col gap-4 p-3">
    <section class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200">Model</label>
      <div class="w-full">
        <ModelSelector
          v-model="selectedModel"
          :models="availableModels" />
      </div>
      <p class="text-xs text-surface-400">Select the model to use for this agent.</p>
    </section>

    <section class="flex flex-col gap-2">
      <div class="flex items-start gap-4">
        <div class="flex flex-1 flex-col gap-2">
          <label class="text-sm font-medium text-surface-200">Skills</label>
          <div class="flex h-10 w-full items-center gap-2">
            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="skill in skillOptions.filter((s) => isSkillSelected(s.id))"
                :key="skill.id"
                class="rounded border border-dotted border-surface-600 px-2 py-1 font-mono text-xs text-surface-300">
                {{ skill.title }}
              </div>
            </div>
            <Button
              severity="tertiary"
              icon="fas fa-plus"
              :pt:root="{
                class:
                  'bg-surface-700/50 text-surface-200 text-sm py-1.5 px-2 flex items-center justify-center rounded-md hover:text-white transition-colors duration-200 h-8 w-8 cursor-pointer',
              }"
              @click="onToggleSkillsPopover" />
            <Popover
              id="launch-dialog-skills-popover"
              ref="skillsPopoverRef"
              position="top"
              :pt:root="{
                class: 'bg-surface-800 border border-surface-700 rounded-md shadow-lg !z-[3001]',
              }"
              :pt:content="{ class: 'p-1 rounded-md' }">
              <div class="flex w-fit min-w-[200px] flex-col gap-1.5">
                <div class="max-h-64 overflow-y-auto">
                  <div
                    v-for="skill in skillOptions"
                    :key="skill.id"
                    class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-surface-700/40"
                    @click="toggleSkill(skill.id)">
                    <Checkbox
                      :model-value="isSkillSelected(skill.id)"
                      binary
                      size="small"
                      @click.stop
                      @update:model-value="toggleSkill(skill.id)" />
                    <span class="flex-1 truncate font-mono text-sm text-surface-200">
                      {{ skill.title }}
                    </span>
                  </div>
                  <div
                    v-if="skillOptions.length === 0"
                    class="p-2 text-xs text-surface-400">
                    No skills available
                  </div>
                </div>
              </div>
            </Popover>
          </div>
          <p class="text-xs text-surface-400">Select skills to include with this agent.</p>
        </div>
        <div class="flex flex-col gap-2 border-l border-surface-600 pl-4">
          <label class="text-sm font-medium text-surface-200">Max iterations</label>
          <div class="flex h-10 items-center">
            <input
              :value="maxIterations"
              min="1"
              type="number"
              class="w-32 rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
              @input="handleMaxIterationsInput" />
          </div>
          <p class="text-xs text-surface-400">Max agent steps.</p>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200">Additional instructions</label>
      <textarea
        v-model="instructions"
        autofocus
        placeholder="Add overall instructions for the agent..."
        class="min-h-[96px] w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500" />
      <p class="text-xs text-surface-400">Add last minute instructions for the agent.</p>
    </section>

    <label class="text-sm font-medium text-surface-200">Highlighted Selections</label>
    <section
      class="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1"
      @keydown="handleSelectionsKeydown">
      <article
        v-for="entry in entries"
        :key="entry.id"
        class="flex flex-col gap-2 rounded-md border border-surface-700 bg-surface-900/50 p-3">
        <div class="flex items-start gap-2">
          <div class="relative flex-1">
            <span
              class="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center rounded-l-md border border-surface-700 bg-surface-900/90 text-surface-400">
              <i class="fa-solid fa-i-cursor text-sm" />
            </span>
            <input
              v-model="entry.selection"
              readonly
              disabled
              class="w-full rounded-md border border-surface-700 bg-surface-900/80 py-2 pl-10 pr-3 text-sm text-surface-500 focus:outline-none focus:ring-0"
              placeholder="Select text in the editor..." />
          </div>
          <button
            class="p-button p-component p-button-rounded p-button-text p-button-danger flex h-9 w-9 items-center justify-center"
            type="button"
            title="Remove selection"
            tabindex="-1"
            @click="removeEntry(entry.id)">
            <i class="fa-solid fa-trash text-sm leading-none" />
          </button>
        </div>

        <input
          v-model="entry.comment"
          class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
          placeholder="Add a comment about this selection..." />
      </article>
    </section>
    <p class="text-xs text-surface-400">
      Highlight text in the Caido editor. The latest selection appears above.
    </p>

    <button
      class="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-surface-600 text-sm text-surface-300 transition hover:border-surface-500 hover:text-surface-100"
      type="button"
      @click="addEmptyEntry">
      <span class="text-lg leading-none">+</span>
      Add selection entry
    </button>

    <footer class="flex items-center justify-between">
      <div class="flex gap-2">
        <Button
          icon="fas fa-times"
          label="Cancel"
          size="small"
          severity="secondary"
          outlined
          type="button"
          @click="handleCancel" />
        <Button
          icon="fas fa-check"
          label="Confirm"
          size="small"
          type="button"
          @click="handleConfirm" />
      </div>
    </footer>
  </div>
</template>
