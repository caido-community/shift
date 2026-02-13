<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import { computed, ref, watch } from "vue";

import type { AgentEditorBinary } from "../useAgentEditorForm";

const visible = defineModel<boolean>("visible", { required: true });

const {
  mode,
  existingPaths,
  binary = undefined,
  originalPath = undefined,
} = defineProps<{
  mode: "add" | "edit";
  existingPaths: string[];
  binary?: AgentEditorBinary;
  originalPath?: string;
}>();

const emit = defineEmits<{
  save: [binary: AgentEditorBinary];
}>();

const path = ref("");
const instructions = ref("");

const headerLabel = computed(() => (mode === "add" ? "Add Whitelisted Binary" : "Edit Binary"));
const saveLabel = computed(() => (mode === "add" ? "Add" : "Save"));
const trimmedPath = computed(() => path.value.trim());
const isDuplicatePath = computed(
  () =>
    trimmedPath.value !== "" &&
    existingPaths.includes(trimmedPath.value) &&
    trimmedPath.value !== (originalPath ?? "")
);
const canSave = computed(() => trimmedPath.value !== "" && !isDuplicatePath.value);
const hasPathError = computed(
  () => path.value !== "" && (trimmedPath.value === "" || isDuplicatePath.value)
);

const syncFromProps = () => {
  if (mode === "add" || binary === undefined) {
    path.value = "";
    instructions.value = "";
    return;
  }

  path.value = binary.path;
  instructions.value = binary.instructions;
};

watch(
  [() => visible.value, () => mode, () => binary],
  ([isVisible]) => {
    if (isVisible) {
      syncFromProps();
    }
  },
  { immediate: true }
);

const handleCancel = () => {
  visible.value = false;
};

const handleSave = () => {
  if (!canSave.value) {
    return;
  }

  emit("save", {
    path: trimmedPath.value,
    instructions: instructions.value.trim(),
  });
  visible.value = false;
};
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="headerLabel"
    :style="{ width: '38rem' }">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label
          for="binary-path"
          class="text-base font-medium text-surface-200">
          Binary Path
        </label>
        <InputText
          id="binary-path"
          v-model="path"
          placeholder="/usr/local/bin/ffuf"
          class="w-full font-mono text-sm"
          :invalid="hasPathError" />
        <p
          v-if="isDuplicatePath"
          class="text-sm text-red-400">
          This binary path already exists.
        </p>
        <p
          v-else
          class="text-sm text-surface-400">
          Use an absolute path to the binary executable.
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label
          for="binary-instructions"
          class="text-base font-medium text-surface-200">
          Instructions
        </label>
        <Textarea
          id="binary-instructions"
          v-model="instructions"
          placeholder="Optional usage guidance for this binary..."
          rows="6"
          class="w-full font-mono text-sm" />
      </div>
    </div>
    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        @click="handleCancel" />
      <Button
        :label="saveLabel"
        :disabled="!canSave"
        @click="handleSave" />
    </template>
  </Dialog>
</template>
