<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import Textarea from "primevue/textarea";
import type { SkillScope } from "shared";
import { computed, ref, watch } from "vue";

const visible = defineModel<boolean>("visible", { required: true });

const emit = defineEmits<{
  addStatic: [input: { title: string; content: string; scope: SkillScope }];
  addDynamic: [input: { title: string; url: string; scope: SkillScope }];
}>();

const skillTypeOptions = ref([
  { label: "Static", value: "static" },
  { label: "Dynamic (URL)", value: "dynamic" },
]);

const scopeOptions = ref([
  { label: "Project", value: "project" },
  { label: "Global", value: "global" },
]);

const activeTab = ref<"static" | "dynamic">("static");
const title = ref("");
const content = ref("");
const url = ref("");
const scope = ref<SkillScope>("project");

const resetForm = () => {
  title.value = "";
  content.value = "";
  url.value = "";
  activeTab.value = "static";
  scope.value = "project";
};

watch(visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

const isValidUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const canSaveStatic = () => title.value.trim() !== "" && content.value.trim() !== "";
const canSaveDynamic = () => title.value.trim() !== "" && isValidUrl(url.value.trim());
const hasUrlError = computed(() => url.value.trim() !== "" && !isValidUrl(url.value.trim()));

const handleSave = () => {
  if (activeTab.value === "static") {
    if (!canSaveStatic()) return;
    emit("addStatic", {
      title: title.value.trim(),
      content: content.value.trim(),
      scope: scope.value,
    });
  } else {
    if (!canSaveDynamic()) return;
    emit("addDynamic", {
      title: title.value.trim(),
      url: url.value.trim(),
      scope: scope.value,
    });
  }
  visible.value = false;
};

const handleCancel = () => {
  visible.value = false;
};

const canSave = () => {
  if (activeTab.value === "static") {
    return canSaveStatic();
  }
  return canSaveDynamic();
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Add Skill"
    :style="{ width: '35rem' }">
    <div class="flex flex-col gap-4">
      <SelectButton
        v-model="activeTab"
        :options="skillTypeOptions"
        option-label="label"
        option-value="value"
        class="w-full flex"
        :pt="{
          button: { class: 'flex-1 w-full' },
        }" />

      <div class="flex flex-col gap-2">
        <label class="font-medium text-surface-200">Scope</label>
        <SelectButton
          v-model="scope"
          :options="scopeOptions"
          option-label="label"
          option-value="value"
          class="w-full flex"
          :pt="{
            button: { class: 'flex-1 w-full' },
          }" />
        <p class="text-xs text-surface-400">
          {{
            scope === "project"
              ? "Only available in the current project"
              : "Available across all projects"
          }}
        </p>
      </div>

      <div class="h-[250px]">
        <div
          v-if="activeTab === 'static'"
          class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label
              for="static-title"
              class="font-medium text-surface-200">
              Title
            </label>
            <InputText
              id="static-title"
              v-model="title"
              placeholder="XSS Testing"
              class="w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="static-content"
              class="font-medium text-surface-200">
              Content
            </label>
            <Textarea
              id="static-content"
              v-model="content"
              placeholder="Instructions for the agent..."
              rows="10"
              class="w-full font-mono text-sm" />
          </div>
        </div>

        <div
          v-else
          class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label
              for="dynamic-title"
              class="font-medium text-surface-200">
              Title
            </label>
            <InputText
              id="dynamic-title"
              v-model="title"
              placeholder="XSS Testing"
              class="w-full" />
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="dynamic-url"
              class="font-medium text-surface-200">
              URL
            </label>
            <InputText
              id="dynamic-url"
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
              Supports GitHub Gist raw URLs. Content will be fetched automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="handleCancel" />
      <Button
        label="Add"
        :disabled="!canSave()"
        @click="handleSave" />
    </template>
  </Dialog>
</template>
