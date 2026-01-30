<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Popover from "primevue/popover";
import { ref } from "vue";

import type { LaunchDialogProps } from "./types";
import { useLaunchDialog } from "./useLaunchDialog";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";

const { onConfirm, onCancel, initialSkillIds } = defineProps<LaunchDialogProps>();

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
  initialSkillIds,
});

const skillsPopoverRef = ref<InstanceType<typeof Popover>>();
const onToggleSkillsPopover = (event: MouseEvent) => {
  skillsPopoverRef.value?.toggle(event);
};
</script>

<template>
  <div class="flex w-[520px] flex-col gap-5">
    <div class="grid grid-cols-[1fr_140px] gap-4">
      <section class="flex flex-col gap-2">
        <label class="text-sm font-medium text-surface-200">Model</label>
        <ModelSelector
          v-model="selectedModel"
          :models="availableModels"
          direction="down"
          class="w-full [&>button]:w-full [&>button]:justify-between [&>div:last-child]:!z-[3001]" />
      </section>

      <section class="flex flex-col gap-2">
        <label class="text-sm font-medium text-surface-200">Max iterations</label>
        <input
          :value="maxIterations"
          min="1"
          type="number"
          class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
          @input="handleMaxIterationsInput" />
      </section>
    </div>

    <section class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-surface-200">Skills</label>
      </div>

      <div
        class="flex min-h-[42px] flex-wrap items-center gap-2 rounded-md border border-surface-700 bg-surface-800 px-3 py-2">
        <div
          v-for="skill in skillOptions.filter((s) => isSkillSelected(s.id))"
          :key="skill.id"
          class="flex items-center gap-1.5 rounded border border-surface-600 bg-surface-600/50 px-2 py-1 font-mono text-xs text-surface-200">
          {{ skill.title }}
          <i
            class="fas fa-times cursor-pointer text-surface-400 transition-colors hover:text-surface-100"
            @click="toggleSkill(skill.id)" />
        </div>

        <button
          class="flex h-6 w-6 items-center justify-center rounded text-surface-400 transition-colors hover:bg-surface-700 hover:text-surface-200"
          @click="onToggleSkillsPopover">
          <i class="fas fa-plus text-xs" />
        </button>

        <Popover
          id="launch-dialog-skills-popover"
          ref="skillsPopoverRef"
          position="bottom"
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
    </section>

    <section class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200">Additional instructions</label>
      <textarea
        v-model="instructions"
        autofocus
        placeholder="Add overall instructions for the agent..."
        class="min-h-[96px] w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500" />
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-surface-200">Highlighted Selections</label>
        <span class="text-xs text-surface-400">Highlight text in the Caido editor.</span>
      </div>

      <div
        class="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1"
        @keydown="handleSelectionsKeydown">
        <article
          v-for="entry in entries"
          :key="entry.id"
          class="flex flex-col gap-2 rounded-md border border-surface-700 bg-surface-800/30 p-3">
          <div class="flex items-start gap-2">
            <div class="relative flex-1">
              <span
                class="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center rounded-l-md border-r border-surface-700 bg-surface-800 text-surface-400">
                <i class="fa-solid fa-i-cursor text-sm" />
              </span>
              <input
                v-model="entry.selection"
                readonly
                disabled
                class="w-full rounded-md border border-surface-700 bg-surface-900/50 py-2 pl-10 pr-3 text-sm text-surface-400 focus:outline-none"
                placeholder="Select text in the editor..." />
            </div>
            <button
              class="flex h-9 w-9 items-center justify-center rounded text-surface-400 transition-colors hover:bg-surface-700 hover:text-red-400"
              type="button"
              title="Remove selection"
              tabindex="-1"
              @click="removeEntry(entry.id)">
              <i class="fa-solid fa-trash text-sm" />
            </button>
          </div>

          <input
            v-model="entry.comment"
            class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
            placeholder="Add a comment about this selection..." />
        </article>

        <button
          class="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-surface-700 text-sm text-surface-400 transition hover:border-surface-600 hover:bg-surface-800/50 hover:text-surface-300"
          type="button"
          @click="addEmptyEntry">
          <i class="fas fa-plus text-xs" />
          <span>Add selection entry</span>
        </button>
      </div>
    </section>

    <footer class="flex items-center justify-end gap-2 pt-2">
      <Button
        icon="fas fa-times"
        label="Cancel"
        severity="secondary"
        text
        size="small"
        @click="handleCancel" />
      <Button
        icon="fas fa-check"
        label="Confirm"
        size="small"
        @click="handleConfirm" />
    </footer>
  </div>
</template>
