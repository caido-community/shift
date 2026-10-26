<script setup lang="ts">
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Popover from "primevue/popover";
import Select from "primevue/select";
import { ref } from "vue";

import type { LaunchDialogProps } from "./types";
import { useLaunchDialog } from "./useLaunchDialog";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";
import { AGENT_MODES } from "@/components/agent/modes";

const { sessionId, onConfirm, onCancel, initialSkillIds, initialCustomAgentId } =
  defineProps<LaunchDialogProps>();

const {
  instructions,
  mode,
  request,
  selectedModel,
  selectedCustomAgentId,
  hasAgent,
  hasAgentOptions,
  availableModels,
  skillOptions,
  agentOptions,
  isSkillSelected,
  toggleSkill,
  selectAgent,
  openAgentsPage,
  handleConfirm,
} = useLaunchDialog({
  sessionId,
  onConfirm,
  onCancel,
  initialSkillIds,
  initialCustomAgentId,
});

const launchShortcut = navigator.userAgent.includes("Mac") ? "⌘↵" : "Ctrl↵";

const skillsPopoverRef = ref<InstanceType<typeof Popover>>();
const onToggleSkillsPopover = (event: MouseEvent) => {
  skillsPopoverRef.value?.toggle(event);
};

const handleAgentChange = (value: string | undefined) => {
  selectAgent(value === "" ? undefined : value);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    handleConfirm();
  }
};
</script>

<template>
  <div
    class="flex w-[520px] flex-col gap-5"
    @keydown="handleKeydown">
    <div
      v-if="request !== undefined"
      class="-mt-2 flex min-w-0 items-center gap-2 font-mono text-xs text-surface-400">
      <span class="font-bold text-green-400">{{ request.method }}</span>
      <span class="truncate">{{ request.target }}</span>
    </div>

    <div class="flex gap-3">
      <section class="flex w-[200px] shrink-0 flex-col gap-2">
        <label class="text-sm font-medium text-surface-200">Model</label>
        <div
          class="flex h-[34px] items-center rounded-md border border-surface-700 bg-surface-900 px-1">
          <ModelSelector
            v-model="selectedModel"
            :models="availableModels"
            direction="down"
            class="w-full [&>button:first-child]:flex-1 [&>button:first-child]:justify-between [&>div:last-child]:!z-[3001]" />
        </div>
      </section>

      <section class="flex flex-1 flex-col gap-2">
        <label class="text-sm font-medium text-surface-200">Mode</label>
        <div class="flex h-[34px] rounded-md border border-surface-700 bg-surface-900 p-[3px]">
          <button
            v-for="m in AGENT_MODES"
            :key="m.value"
            type="button"
            :title="m.description"
            :class="[
              'flex flex-1 items-center justify-center gap-1.5 rounded text-[13px] transition-colors',
              mode === m.value
                ? 'bg-surface-700 text-surface-0'
                : 'text-surface-400 hover:text-surface-200',
            ]"
            @click="mode = m.value">
            <i :class="[m.icon, 'text-xs']" />
            {{ m.label }}
          </button>
        </div>
      </section>
    </div>

    <section class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200">Custom agent</label>
      <Select
        v-if="hasAgentOptions"
        :model-value="selectedCustomAgentId ?? ''"
        :options="[
          { label: 'No custom agent', value: '' },
          ...agentOptions.map((a) => ({ label: a.name, value: a.id })),
        ]"
        option-label="label"
        option-value="value"
        placeholder="Select custom agent..."
        class="w-full"
        overlay-class="!z-[3001] overflow-hidden rounded-md border border-surface-700 bg-surface-800 text-surface-100 shadow-lg"
        @update:model-value="handleAgentChange" />
      <div
        v-else
        class="flex items-start gap-3 rounded-md border border-surface-700 bg-surface-800/50 p-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-700 text-surface-300">
          <i class="fas fa-robot text-sm" />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium text-surface-200">No custom agents yet</span>
            <span class="text-xs leading-relaxed text-surface-400">
              Create custom agents in Shift Agents to bundle skills, workflows, binaries, and
              instructions for future launches.
            </span>
          </div>
          <Button
            class="w-fit"
            icon="fas fa-arrow-up-right-from-square"
            label="Open Custom Agents"
            severity="secondary"
            size="small"
            outlined
            @click="openAgentsPage" />
        </div>
      </div>
    </section>

    <section
      v-if="!hasAgent"
      class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200">Skills</label>

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
      <label class="text-sm font-medium text-surface-200">
        Instructions <span class="font-normal text-surface-400">(optional)</span>
      </label>
      <textarea
        v-model="instructions"
        autofocus
        placeholder="Test this for IDOR"
        class="min-h-[96px] w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500" />
    </section>

    <footer class="flex items-center justify-end gap-2">
      <Button
        label="Cancel"
        severity="secondary"
        text
        size="small"
        @click="onCancel" />
      <Button
        size="small"
        class="gap-2"
        @click="handleConfirm">
        <span class="font-semibold">Launch</span>
        <kbd class="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[11px] leading-none">
          {{ launchShortcut }}
        </kbd>
      </Button>
    </footer>
  </div>
</template>
