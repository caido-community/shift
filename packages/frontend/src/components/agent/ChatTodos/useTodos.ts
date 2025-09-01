import { computed } from "vue";

import { useAgentsStore } from "@/stores/agents";

export const useTodos = () => {
  const agentStore = useAgentsStore();

  const todos = computed(() => {
    if (!agentStore.selectedToolContext) {
      return [];
    }

    return agentStore.selectedToolContext.todoManager.getTodos();
  });

  const hasTodos = computed(() => todos.value.length > 0);

  const pendingTodos = computed(() =>
    todos.value.filter((todo) => todo.status === "pending"),
  );

  const completedTodos = computed(() =>
    todos.value.filter((todo) => todo.status === "completed"),
  );

  return {
    todos,
    hasTodos,
    pendingTodos,
    completedTodos,
  };
};
