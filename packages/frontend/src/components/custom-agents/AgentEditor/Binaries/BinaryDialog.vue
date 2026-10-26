<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import { computed, ref, watch } from "vue";

import type { AgentEditorBinary } from "../useAgentEditorForm";

const visible = defineModel<boolean>("visible", { required: true });

const { existingPaths, binary = undefined } = defineProps<{
  existingPaths: string[];
  binary?: AgentEditorBinary;
}>();

const emit = defineEmits<{
  save: [binary: AgentEditorBinary];
}>();

const path = ref("");
const instructions = ref("");

const isEditing = computed(() => binary !== undefined);
const trimmedPath = computed(() => path.value.trim());
const isDuplicatePath = computed(
  () =>
    trimmedPath.value !== "" &&
    existingPaths.includes(trimmedPath.value) &&
    trimmedPath.value !== binary?.path
);
const canSave = computed(() => trimmedPath.value !== "" && !isDuplicatePath.value);
const hasPathError = computed(
  () => path.value !== "" && (trimmedPath.value === "" || isDuplicatePath.value)
);

watch(
  [visible, () => binary],
  ([isVisible]) => {
    if (!isVisible) return;
    path.value = binary?.path ?? "";
    instructions.value = binary?.instructions ?? "";
  },
  { immediate: true }
);

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
    :header="isEditing ? 'Edit Binary' : 'Add Whitelisted Binary'"
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

      <div class="flex flex-col">
        <label
          for="binary-instructions"
          class="text-base font-medium text-surface-200">
          Instructions
        </label>
        <p class="text-sm text-surface-400 mb-2">
          If no instructions are provided, the agent will try to figure out usage with the -h flag.
          Explain how to run the tool, what the input is, what output to expect, and any required
          resources like wordlists (include their paths).
        </p>
        <Textarea
          id="binary-instructions"
          v-model="instructions"
          placeholder="Example: input/output format, flags, required wordlist paths..."
          rows="6"
          class="w-full font-mono text-sm" />
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
        @click="handleSave" />
    </template>
  </Dialog>
</template>
