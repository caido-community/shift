import { tool } from "ai";
import { type Result } from "shared";
import { z } from "zod";

import { withReadableTodosText } from "./utils";

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
  ids: z.array(z.number().int().positive()).describe("The IDs of the todo items to complete"),
});

const valueSchema = z.object({
  todos: z.array(todoSchema),
});

const outputSchema = ToolResult.schema(valueSchema);

type TodoCompleteInput = z.infer<typeof inputSchema>;
type TodoCompleteValue = z.infer<typeof valueSchema>;
type TodoCompleteOutput = ToolResultType<TodoCompleteValue>;

const formatCompletedPreview = (todos: Todo[] | undefined, ids: number[] | undefined): string => {
  const first = todos?.[0];
  if (isPresent(first) && todos?.length === 1) {
    return truncate(first.content, 52);
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
  description:
    "Mark one or more todo items as completed by their IDs. Use this to track progress through a testing workflow and indicate which steps have been finished. Completed todos remain visible but are marked as done. The ids array accepts multiple todo IDs to complete several items at once. If any ID is invalid or already completed, an error is returned for that specific item. Todos that were in progress can be completed directly. Returns the list of todos that were successfully completed.",
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
  toModelOutput: ({ output }) => {
    switch (output.kind) {
      case "Ok": {
        const value = output.value as TodoCompleteValue & { message: string };
        return {
          type: "text",
          value: withReadableTodosText(value.message, value.todos),
        };
      }
      case "Error":
        return {
          type: "text",
          value: `Failed to complete todos: ${output.error.message}`,
        };
      default:
        return {
          type: "text",
          value: "Unknown error",
        };
    }
  },
});
