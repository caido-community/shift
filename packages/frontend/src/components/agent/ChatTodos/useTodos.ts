import { computed, ref } from "vue";

import { useSession } from "../useSession";

import { isTodoCompleted, isTodoInProgress } from "@/agent/types";

export function useTodos() {
  const session = useSession();
  const isExpanded = ref(false);

  const todos = computed(() => session.todos);
  const hasTodos = computed(() => todos.value.length > 0);

  const workingTodo = computed(() => todos.value.find((todo) => isTodoInProgress(todo)));

  const pendingTodos = computed(() => todos.value.filter((todo) => todo.status === "pending"));

  const completedTodos = computed(() => todos.value.filter((todo) => isTodoCompleted(todo)));

  const summary = computed(() => {
    const completed = completedTodos.value.length;
    const total = todos.value.length;

    return `${completed} of ${total} completed`;
  });

  function toggle() {
    isExpanded.value = !isExpanded.value;
  }

  return {
    todos,
    hasTodos,
    workingTodo,
    pendingTodos,
    completedTodos,
    isExpanded,
    summary,
    toggle,
  };
}
