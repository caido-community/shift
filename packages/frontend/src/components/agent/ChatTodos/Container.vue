<script setup lang="ts">
import { useTodos } from "./useTodos";

const { hasTodos, pendingTodos, completedTodos } = useTodos();
</script>

<template>
  <div v-if="hasTodos" class="p-4 bg-surface-900 border-t border-surface-700">
    <div class="flex items-center gap-2 mb-3">
      <i class="fas fa-tasks text-surface-400 text-sm" />
      <span class="text-surface-300 font-mono text-sm font-medium">Tasks</span>
    </div>

    <div class="space-y-2 max-h-40 overflow-y-auto">
      <div
        v-for="todo in pendingTodos"
        :key="todo.id"
        class="flex items-start gap-2"
      >
        <input
          type="checkbox"
          :checked="false"
          disabled
          class="mt-0.5 w-4 h-4 rounded border-surface-600 bg-surface-800 text-blue-400 focus:ring-0 cursor-not-allowed opacity-60"
        />
        <span class="text-surface-300 text-sm font-mono leading-5 break-words">
          {{ todo.content }}
        </span>
      </div>

      <div
        v-for="todo in completedTodos"
        :key="todo.id"
        class="flex items-start gap-2"
      >
        <input
          type="checkbox"
          :checked="true"
          disabled
          class="mt-0.5 w-4 h-4 rounded border-surface-600 bg-blue-400 text-blue-400 focus:ring-0 cursor-not-allowed"
        />
        <span
          class="text-surface-400 text-sm font-mono leading-5 break-words line-through"
        >
          {{ todo.content }}
        </span>
      </div>
    </div>
  </div>
</template>
