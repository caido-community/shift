import { computed, ref } from "vue";

import { useSession } from "../useSession";

export function useTodos() {
  const session = useSession();
  const isExpanded = ref(false);

  const todos = computed(() => session.todos);
  const hasTodos = computed(() => todos.value.length > 0);

  const pendingTodos = computed(() => todos.value.filter((todo) => !todo.completed));

  const completedTodos = computed(() => todos.value.filter((todo) => todo.completed));

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
    pendingTodos,
    completedTodos,
    isExpanded,
    summary,
    toggle,
  };
}
