<script setup lang="ts">
import type { MessageMetadata, PartState } from "shared";
import { computed, ref, toRef, watch } from "vue";

import { useTool } from "../useTool";

import { type Todo } from "@/agent/types";
import { useSession } from "@/components/agent/useSession";
import { TextShimmer } from "@/components/common/TextShimmer";
import { isPresent, pluralize } from "@/utils";

const { partState, messageMetadata, output } = defineProps<{
  partState: PartState;
  messageMetadata: MessageMetadata | undefined;
  output: unknown;
}>();

const session = useSession();

const { isLoading, isError, isFinished, errorMessage, extractedOutput } = useTool(
  {
    partState: toRef(() => partState),
    messageMetadata: toRef(() => messageMetadata),
    output: toRef(() => output),
  },
  "Failed to create todos"
);

type TodoAddValue = { todos: Todo[]; message: string };

const todoAddOutput = computed<TodoAddValue | undefined>(() => {
  const out = extractedOutput.value;
  if (isPresent(out) && typeof out === "object" && "todos" in out) {
    return out as TodoAddValue;
  }
  return undefined;
});

const createdTodoIds = computed(() => new Set(todoAddOutput.value?.todos.map((t) => t.id) ?? []));

const todos = computed(() => {
  const storeTodos = session.todos;
  const ids = createdTodoIds.value;
  return storeTodos.filter((todo) => ids.has(todo.id));
});

const completedCount = computed(() => todos.value.filter((t) => t.completed).length);

const isExpanded = ref(true);

watch(isFinished, (finished) => {
  if (finished) {
    isExpanded.value = false;
  }
});

const toggle = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<template>
  <div class="animate-fade-in">
    <div
      v-if="isLoading"
      class="flex items-center h-5 text-surface-300 text-sm">
      <TextShimmer>
        <span>Creating </span>
        <span class="text-surface-500">todos</span>
      </TextShimmer>
    </div>

    <div
      v-else-if="isError"
      class="flex items-center h-5 text-surface-500 text-sm">
      {{ errorMessage }}
    </div>

    <div
      v-else-if="todos.length > 0"
      class="rounded border border-surface-700 bg-surface-900/50 overflow-hidden">
      <button
        class="w-full px-2 py-1 flex items-center justify-between hover:bg-surface-800/50 transition-colors"
        :class="{ 'border-b border-surface-700/50': isExpanded }"
        @click="toggle">
        <span class="text-surface-400 text-xs">
          {{ completedCount }}/{{ todos.length }} {{ pluralize(todos.length, "todo") }}
        </span>
        <i
          class="fas fa-chevron-down text-surface-500 text-[10px] transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }" />
      </button>
      <div
        v-show="isExpanded"
        class="max-h-28 overflow-y-auto">
        <div
          v-for="todo in todos"
          :key="todo.id"
          class="flex items-center gap-1.5 px-2 py-1 border-b border-surface-700/30 last:border-b-0">
          <div
            v-if="todo.completed"
            class="w-3 h-3 rounded-sm bg-blue-500 shrink-0 flex items-center justify-center">
            <i class="fas fa-check text-white text-[8px]" />
          </div>
          <div
            v-else
            class="w-3 h-3 rounded-sm border border-surface-600 bg-surface-800 shrink-0" />
          <span
            class="text-xs font-mono truncate"
            :class="todo.completed ? 'text-surface-500 line-through' : 'text-surface-300'">
            {{ todo.content }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-else
      class="flex items-center h-5 text-surface-300 text-sm">
      <span>Created </span>
      <span class="text-surface-500"
        >{{ todoAddOutput?.todos.length ?? "" }}
        {{ pluralize(todoAddOutput?.todos.length ?? 0, "todo") }}</span
      >
    </div>
  </div>
</template>
