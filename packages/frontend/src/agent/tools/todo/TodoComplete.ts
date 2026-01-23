import { tool } from "ai";
import { type Result } from "shared";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import {
  type Todo,
  todoSchema,
  type ToolDisplay,
  ToolResult,
  type ToolResult as ToolResultType,
} from "@/agent/types";
import { isPresent, pluralize, truncate } from "@/utils";

const inputSchema = z.object({
  ids: z.array(z.string()).describe("The IDs of the todo items to complete"),
});

const valueSchema = z.object({
  todos: z.array(todoSchema),
});

const outputSchema = ToolResult.schema(valueSchema);

type TodoCompleteInput = z.infer<typeof inputSchema>;
type TodoCompleteValue = z.infer<typeof valueSchema>;
type TodoCompleteOutput = ToolResultType<TodoCompleteValue>;

const formatCompletedPreview = (todos: Todo[] | undefined, ids: string[] | undefined): string => {
  const first = todos?.[0];
  if (isPresent(first) && todos?.length === 1) {
    return truncate(first.content, 56);
  }
  if (isPresent(ids)) {
    return `${ids.length} ${pluralize(ids.length, "todo")}`;
  }
  return "todos";
};

export const display = {
  streaming: ({ input }) => [
    { text: "Completing " },
    {
      text: isPresent(input?.ids)
        ? `${input.ids.length} ${pluralize(input.ids.length, "todo")}`
        : "todos",
      muted: true,
    },
  ],
  success: ({ input, output }) => [
    { text: "Completed " },
    { text: formatCompletedPreview(output?.todos, input?.ids), muted: true },
  ],
  error: () => "Failed to complete todos",
} satisfies ToolDisplay<TodoCompleteInput, TodoCompleteValue>;

export const TodoComplete = tool({
  description: "Mark todo items as completed",
  inputSchema,
  outputSchema,
  execute: ({ ids }, { experimental_context }): TodoCompleteOutput => {
    const context = experimental_context as AgentContext;
    const results = ids.map((id) => context.completeTodo(id));

    const errors = results.filter((r) => r.kind === "Error");
    if (errors.length > 0) {
      return ToolResult.err(errors.map((e) => e.error).join("; "));
    }

    const todos = results
      .filter((r): r is Result<Todo> & { kind: "Ok" } => r.kind === "Ok")
      .map((r) => r.value);
    return ToolResult.ok({
      message: `Completed ${todos.length} ${pluralize(todos.length, "todo")}`,
      todos,
    });
  },
});
