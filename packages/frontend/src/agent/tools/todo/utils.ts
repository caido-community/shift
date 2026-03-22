import type { Todo } from "@/agent/types";

const statusLabel: Record<Todo["status"], string> = {
  pending: "pending",
  in_progress: "in progress",
  completed: "completed",
};

function formatTodosAsReadableText(todos: Todo[]): string {
  if (todos.length === 0) return "";
  return todos.map((t) => `#${t.id} [${statusLabel[t.status]}] ${t.content}`).join("\n");
}

export function withReadableTodosText(message: string, todos: Todo[]): string {
  const block = formatTodosAsReadableText(todos);
  if (block === "") return message;
  return `${message}\n\n${block}`;
}
