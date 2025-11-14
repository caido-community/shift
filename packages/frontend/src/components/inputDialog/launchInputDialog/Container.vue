<script setup lang="ts">
import Button from "primevue/button";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { LaunchInputDialogResult } from "./types";

import { ModelSelector } from "@/components/agent/ChatInput/ModelSelector";
import { PromptSelector } from "@/components/agent/ChatInput/PromptSelector";
import { useSDK } from "@/plugins/sdk";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import type { FrontendSDK } from "@/types";

type SelectionEntry = {
  id: number;
  selection: string;
  comment: string;
};

const props = defineProps<{
  title: string;
  placeholder?: string;
  sdk?: FrontendSDK;
  onConfirm: (value: LaunchInputDialogResult) => void;
  onCancel: () => void;
}>();

const injectedSdk = useSDK() as FrontendSDK | undefined;
const sdk = computed<FrontendSDK | undefined>(() => props.sdk ?? injectedSdk);
const configStore = useConfigStore();
const uiStore = useUIStore();

// Use a temporary ID for prompt selection in the dialog
const dialogAgentId = "__launch_dialog__";

const entries = ref<SelectionEntry[]>([{ id: 0, selection: "", comment: "" }]);
let nextId = 1;
const instructions = ref("");
const maxInteractions = ref(
  Number.isFinite(configStore.maxIterations) && configStore.maxIterations > 0
    ? configStore.maxIterations
    : 1,
);

const lastEntry = () => entries.value.at(-1) ?? null;

const syncSelection = () => {
  const entry = lastEntry();
  if (!entry) return;
  const selectedText =
    sdk.value?.window?.getActiveEditor?.()?.getSelectedText?.() ?? "";
  if (entry.selection !== selectedText) {
    entry.selection = selectedText;
  }
};

const addEmptyEntry = () => {
  const active = lastEntry();
  if (
    active &&
    active.selection.trim().length === 0 &&
    active.comment.trim().length === 0
  ) {
    syncSelection();
    return;
  }

  entries.value.push({ id: nextId++, selection: "", comment: "" });
  syncSelection();
};

const removeEntry = (entryId: number) => {
  if (entries.value.length <= 1) {
    entries.value = [{ id: nextId++, selection: "", comment: "" }];
    syncSelection();
    return;
  }

  entries.value = entries.value.filter((entry) => entry.id !== entryId);
  syncSelection();
};

const handleConfirm = () => {
  syncSelection();
  const selections = entries.value
    .map((entry) => ({
      selection: entry.selection.trim(),
      comment: entry.comment.trim(),
    }))
    .filter((entry) => entry.selection.length > 0 || entry.comment.length > 0);
  
  // Get the selected model and prompts
  const model = configStore.agentsModel;
  const selectedPromptIds = uiStore.getSelectedPrompts(dialogAgentId);
  
  props.onConfirm({
    selections,
    instructions: instructions.value.trim(),
    maxInteractions: maxInteractions.value,
    model,
    selectedPromptIds,
  });
};

const handleCancel = () => {
  props.onCancel();
};

const handleMaxInteractionsInput = (event: Event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  const value = Number.parseInt(target.value, 10);
  maxInteractions.value = Number.isNaN(value) ? 1 : Math.max(1, value);
};

const handleSelectionsKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && event.ctrlKey) {
    event.preventDefault();
    event.stopPropagation();
    addEmptyEntry();
  }
};

const selectionEvents: Array<keyof DocumentEventMap> = [
  "selectionchange",
  "mouseup",
  "keyup",
];

onMounted(() => {
  selectionEvents.forEach((eventName) =>
    document.addEventListener(eventName, syncSelection),
  );
  syncSelection();
});

onBeforeUnmount(() => {
  selectionEvents.forEach((eventName) =>
    document.removeEventListener(eventName, syncSelection),
  );
});

watch(
  () => configStore.maxIterations,
  (value) => {
    maxInteractions.value =
      Number.isFinite(value) && value && value > 0 ? value : 1;
  },
);
</script>

<template>
  <div class="flex w-[520px] flex-col gap-4 p-3">
    <section class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200" for="model">
        Model
      </label>
      <div class="w-full">
        <ModelSelector variant="chat" />
      </div>
      <p class="text-xs text-surface-400">
        Select the model to use for this agent.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <div class="flex items-start gap-4">
        <div class="flex-1 flex flex-col gap-2">
          <label class="text-sm font-medium text-surface-200" for="prompts">
            Custom Prompts
          </label>
          <div class="w-full flex items-center h-10">
            <PromptSelector :agent-id="dialogAgentId" :is-settings="true" />
          </div>
          <p class="text-xs text-surface-400">
            Select custom prompts to include with this agent.
          </p>
        </div>
        <div class="flex flex-col gap-2 pl-4 border-l border-surface-600">
          <label
            class="text-sm font-medium text-surface-200"
            for="max-interactions"
          >
            Max interactions
          </label>
          <div class="flex items-center h-10">
            <input
              id="max-interactions"
              :value="maxInteractions"
              min="1"
              type="number"
              class="w-32 rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
              @input="handleMaxInteractionsInput"
            />
          </div>
          <p class="text-xs text-surface-400">
            Max agent steps.
          </p>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <label class="text-sm font-medium text-surface-200" for="instructions">
        Additional instructions
      </label>
      <textarea
        id="instructions"
        v-model="instructions"
        autofocus
        :placeholder="
          props.placeholder || 'Add overall instructions for the agent...'
        "
        class="w-full min-h-[96px] rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
      />
      <p class="text-xs text-surface-400">
        Add last minute instructions for the agent.
      </p>
    </section>
    <label class="text-sm font-medium text-surface-200" for="selections">
      Highlighted Selections
    </label>
    <section
      class="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1"
      @keydown="handleSelectionsKeydown"
    >
      <article
        v-for="entry in entries"
        :key="entry.id"
        class="flex flex-col gap-2 rounded-md border border-surface-700 bg-surface-900/50 p-3"
      >
        <div class="flex items-start gap-2">
          <div class="relative flex-1">
            <span
              class="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center rounded-l-md border border-surface-700 bg-surface-900/90 text-surface-400"
            >
              <i class="fa-solid fa-i-cursor text-sm" />
            </span>
            <input
              v-model="entry.selection"
              readonly
              disabled
              class="w-full rounded-md border border-surface-700 bg-surface-900/80 py-2 pl-10 pr-3 text-sm text-surface-500 focus:outline-none focus:ring-0"
              placeholder="Select text in the editor..."
            />
          </div>
          <button
            class="p-button p-component p-button-rounded p-button-text p-button-danger flex h-9 w-9 items-center justify-center"
            type="button"
            title="Remove selection"
            tabindex="-1"
            @click="removeEntry(entry.id)"
          >
            <i class="fa-solid fa-trash text-sm leading-none" />
          </button>
        </div>

        <input
          v-model="entry.comment"
          class="w-full rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-secondary-500"
          placeholder="Add a comment about this selection..."
        />
      </article>
    </section>
    <p class="text-xs text-surface-400">
      Highlight text in the Caido editor. The latest selection appears above.
    </p>

    <button
      class="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-surface-600 text-sm text-surface-300 transition hover:border-surface-500 hover:text-surface-100"
      type="button"
      @click="addEmptyEntry"
    >
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
          @click="handleCancel"
        />
        <Button
          icon="fas fa-check"
          label="Confirm"
          size="small"
          type="button"
          @click="handleConfirm"
        />
      </div>
    </footer>
  </div>
</template>
