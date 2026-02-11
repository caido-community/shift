<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import type { AgentSkillDefinition, UpdateDynamicSkillInput, UpdateStaticSkillInput } from "shared";
import { computed, ref, watch } from "vue";

import { useSDK } from "@/plugins/sdk";
import { getProjectOverride } from "@/stores/skills/store.effects";

const sdk = useSDK();

const { skill, skillContent } = defineProps<{
  skill: AgentSkillDefinition | undefined;
  skillContent: string;
}>();

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  updateStatic: [id: string, input: UpdateStaticSkillInput];
  updateDynamic: [id: string, input: UpdateDynamicSkillInput];
  updateProjectOverride: [skillId: string, additionalContent: string];
}>();

const title = ref("");
const content = ref("");
const url = ref("");
const projectSpecificContent = ref("");
const originalProjectSpecificContent = ref("");

const isGlobalSkill = computed(() => skill?.scope === "global");

watch(
  () => skill,
  async (newSkill) => {
    if (newSkill !== undefined) {
      title.value = newSkill.title;
      if (newSkill.type === "static") {
        content.value = newSkill.content;
        url.value = "";
      } else {
        content.value = skillContent;
        url.value = newSkill.url;
      }

      if (newSkill.scope === "global") {
        const result = await getProjectOverride(sdk, newSkill.id);
        if (result.kind === "Ok" && result.value !== undefined) {
          projectSpecificContent.value = result.value.additionalContent;
          originalProjectSpecificContent.value = result.value.additionalContent;
        } else {
          projectSpecificContent.value = "";
          originalProjectSpecificContent.value = "";
        }
      } else {
        projectSpecificContent.value = "";
        originalProjectSpecificContent.value = "";
      }
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

const canSave = () => {
  if (skill === undefined) return false;
  if (skill.type === "static") {
    return title.value.trim() !== "" && content.value.trim() !== "";
  }
  return title.value.trim() !== "" && isValidUrl(url.value.trim());
};

const hasUrlError = computed(() => url.value.trim() !== "" && !isValidUrl(url.value.trim()));

const handleSave = () => {
  if (skill === undefined || !canSave()) return;

  if (skill.type === "static") {
    emit("updateStatic", skill.id, {
      title: title.value.trim(),
      content: content.value.trim(),
    });
  } else {
    emit("updateDynamic", skill.id, {
      title: title.value.trim(),
      url: url.value.trim(),
    });
  }

  if (
    isGlobalSkill.value &&
    projectSpecificContent.value.trim() !== originalProjectSpecificContent.value.trim()
  ) {
    emit("updateProjectOverride", skill.id, projectSpecificContent.value.trim());
  }

  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Edit Skill"
    :style="{ width: '35rem' }">
    <div
      v-if="skill !== undefined"
      class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label
          for="edit-title"
          class="font-medium text-surface-200">
          Title
        </label>
        <InputText
          id="edit-title"
          v-model="title"
          class="w-full" />
      </div>

      <template v-if="skill.type === 'static'">
        <div class="flex flex-col gap-2">
          <label
            for="edit-content"
            class="font-medium text-surface-200">
            Content
          </label>
          <Textarea
            id="edit-content"
            v-model="content"
            rows="10"
            class="w-full font-mono text-sm" />
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-2">
          <label
            for="edit-url"
            class="font-medium text-surface-200">
            URL
          </label>
          <InputText
            id="edit-url"
            v-model="url"
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
            Supports GitHub Gist raw URLs. Content will be re-fetched on save.
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <label class="font-medium text-surface-200">Current Content (read-only)</label>
          <Textarea
            :model-value="skillContent"
            rows="6"
            readonly
            class="w-full font-mono text-sm opacity-60" />
        </div>
      </template>

      <div
        v-if="isGlobalSkill"
        class="flex flex-col gap-2 border-t border-surface-700 pt-4">
        <label
          for="edit-project-content"
          class="font-medium text-surface-200">
          Project-Specific Content
        </label>
        <Textarea
          id="edit-project-content"
          v-model="projectSpecificContent"
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
        @click="handleCancel" />
      <Button
        label="Save"
        :disabled="!canSave()"
        @click="handleSave" />
    </template>
  </Dialog>
</template>
