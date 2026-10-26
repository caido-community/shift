<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import Textarea from "primevue/textarea";
import type { AgentSkillDefinition, SkillAttachMode, SkillScope } from "shared";
import { computed, ref, watch } from "vue";

import type { SkillForm } from "../useSkills";

import { useSDK } from "@/plugins/sdk";

const SKILL_TYPE_OPTIONS = [
  { label: "Static", value: "static" },
  { label: "Dynamic (URL)", value: "dynamic" },
];

const SCOPE_OPTIONS = [
  { label: "Project", value: "project" },
  { label: "Global", value: "global" },
];

const ATTACH_MODE_OPTIONS = [
  { label: "On-demand", value: "on-demand" },
  { label: "Always", value: "always" },
];

const {
  skill = undefined,
  skillContent = "",
  saving = false,
} = defineProps<{
  skill?: AgentSkillDefinition;
  skillContent?: string;
  saving?: boolean;
}>();

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{ save: [form: SkillForm] }>();

const sdk = useSDK();

const type = ref<"static" | "dynamic">("static");
const title = ref("");
const content = ref("");
const url = ref("");
const scope = ref<SkillScope>("project");
const description = ref("");
const attachMode = ref<SkillAttachMode>("on-demand");
const projectOverride = ref("");
const originalProjectOverride = ref("");

// Snapshot on open so the dialog keeps its content while the close animation runs.
const openedSkill = ref<AgentSkillDefinition>();
const isEditing = computed(() => openedSkill.value !== undefined);
const isGlobalSkill = computed(() => openedSkill.value?.scope === "global");

const loadProjectOverride = async (skillId: string) => {
  const result = await sdk.backend.getProjectOverride(skillId);
  const value = result.kind === "Ok" ? (result.value?.additionalContent ?? "") : "";
  projectOverride.value = value;
  originalProjectOverride.value = value;
};

watch(
  visible,
  (isVisible) => {
    if (!isVisible) return;

    openedSkill.value = skill;
    type.value = skill?.type ?? "static";
    title.value = skill?.title ?? "";
    description.value = skill?.description ?? "";
    attachMode.value = skill?.attachMode ?? "on-demand";
    scope.value = skill?.scope ?? "project";
    content.value =
      skill === undefined ? "" : skill.type === "static" ? skill.content : skillContent;
    url.value = skill?.type === "dynamic" ? skill.url : "";
    projectOverride.value = "";
    originalProjectOverride.value = "";
    if (skill?.scope === "global") {
      void loadProjectOverride(skill.id);
    }
  },
  { immediate: true }
);

const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const hasUrlError = computed(() => url.value.trim() !== "" && !isValidUrl(url.value.trim()));

const canSave = computed(() => {
  if (title.value.trim() === "") return false;
  return type.value === "static" ? content.value.trim() !== "" : isValidUrl(url.value.trim());
});

const handleSave = () => {
  if (!canSave.value || saving) return;

  const override = projectOverride.value.trim();
  emit("save", {
    type: type.value,
    title: title.value.trim(),
    content: content.value.trim(),
    url: url.value.trim(),
    scope: scope.value,
    description: description.value.trim() || undefined,
    attachMode: attachMode.value,
    projectOverride:
      isGlobalSkill.value && override !== originalProjectOverride.value.trim()
        ? override
        : undefined,
  });
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="isEditing ? 'Edit Skill' : 'Add Skill'"
    :style="{ width: '55rem' }">
    <div class="flex flex-col gap-4">
      <SelectButton
        v-if="!isEditing"
        v-model="type"
        :options="SKILL_TYPE_OPTIONS"
        option-label="label"
        option-value="value"
        class="w-full flex"
        :pt="{ button: { class: 'flex-1 w-full' } }" />

      <div class="flex flex-col gap-2">
        <label
          for="skill-title"
          class="font-medium text-surface-200">
          Title
        </label>
        <InputText
          id="skill-title"
          v-model="title"
          placeholder="XSS Testing"
          class="w-full" />
      </div>

      <div class="flex flex-col gap-2">
        <label
          for="skill-description"
          class="font-medium text-surface-200">
          Description
        </label>
        <InputText
          id="skill-description"
          v-model="description"
          placeholder="Short guidance on when to use this skill (optional)"
          class="w-full" />
        <p class="text-xs text-surface-400">
          Shown in the agent prompt catalog. Helps the agent decide when to load full content.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="font-medium text-surface-200">Load mode</label>
        <SelectButton
          v-model="attachMode"
          :options="ATTACH_MODE_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full flex"
          :pt="{ button: { class: 'flex-1 w-full' } }" />
        <p class="text-xs text-surface-400">
          {{
            attachMode === "always"
              ? "Full content is always in the prompt (higher context usage, higher cost)"
              : "Agent loads content on demand when needed"
          }}
        </p>
      </div>

      <div
        v-if="!isEditing"
        class="flex flex-col gap-2">
        <label class="font-medium text-surface-200">Scope</label>
        <SelectButton
          v-model="scope"
          :options="SCOPE_OPTIONS"
          option-label="label"
          option-value="value"
          class="w-full flex"
          :pt="{ button: { class: 'flex-1 w-full' } }" />
        <p class="text-xs text-surface-400">
          {{
            scope === "project"
              ? "Only available in the current project"
              : "Available across all projects"
          }}
        </p>
      </div>

      <div
        v-if="type === 'static'"
        class="flex flex-col gap-2 min-h-[32rem]">
        <label
          for="skill-content"
          class="font-medium text-surface-200">
          Content
        </label>
        <Textarea
          id="skill-content"
          v-model="content"
          placeholder="Instructions for the agent..."
          rows="20"
          class="w-full min-h-[28rem] font-mono text-sm" />
      </div>

      <div
        v-else
        class="flex flex-col gap-4 min-h-[8rem]">
        <div class="flex flex-col gap-2">
          <label
            for="skill-url"
            class="font-medium text-surface-200">
            URL
          </label>
          <InputText
            id="skill-url"
            v-model="url"
            placeholder="https://gist.githubusercontent.com/..."
            :invalid="hasUrlError"
            class="w-full" />
          <p
            v-if="hasUrlError"
            class="text-xs text-red-400">
            Please enter a valid URL (http:// or https://)
          </p>
          <p
            v-else
            class="text-xs text-surface-400">
            {{
              isEditing
                ? "Supports GitHub Gist raw URLs. Content will be re-fetched on save."
                : "Supports GitHub Gist raw URLs. Content will be fetched automatically."
            }}
          </p>
        </div>

        <div
          v-if="isEditing"
          class="flex flex-col gap-2">
          <label class="font-medium text-surface-200">Current Content (read-only)</label>
          <Textarea
            :model-value="content"
            rows="6"
            readonly
            class="w-full font-mono text-sm opacity-60" />
        </div>
      </div>

      <div
        v-if="isGlobalSkill"
        class="flex flex-col gap-2 border-t border-surface-700 pt-4">
        <label
          for="skill-project-content"
          class="font-medium text-surface-200">
          Project-Specific Content
        </label>
        <Textarea
          id="skill-project-content"
          v-model="projectOverride"
          rows="5"
          placeholder="Additional content to append for this project only..."
          class="w-full font-mono text-sm" />
        <p class="text-xs text-surface-400">
          This content will be appended to the skill when used in the current project.
        </p>
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="visible = false" />
      <Button
        :label="isEditing ? 'Save' : 'Add'"
        :disabled="!canSave"
        :loading="saving"
        @click="handleSave" />
    </template>
  </Dialog>
</template>
