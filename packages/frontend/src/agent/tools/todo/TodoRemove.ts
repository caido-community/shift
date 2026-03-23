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
  ids: z.array(z.number().int().positive()).describe("The IDs of the todo items to remove"),
});

const valueSchema = z.object({
  todos: z.array(todoSchema),
});

const outputSchema = ToolResult.schema(valueSchema);

type TodoRemoveInput = z.infer<typeof inputSchema>;
type TodoRemoveValue = z.infer<typeof valueSchema>;
type TodoRemoveOutput = ToolResultType<TodoRemoveValue>;

const formatRemovedPreview = (todos: Todo[] | undefined, ids: number[] | undefined): string => {
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
    { text: "Removing " },
    {
      text: isPresent(input?.ids)
        ? `${input.ids.length} ${pluralize(input.ids.length, "todo")}`
        : "todos",
      muted: true,
    },
  ],
  success: ({ input, output }) => [
    { text: "Removed " },
    { text: formatRemovedPreview(output?.todos, input?.ids), muted: true },
  ],
  error: () => "Failed to remove todos",
} satisfies ToolDisplay<TodoRemoveInput, TodoRemoveValue>;

export const TodoRemove = tool({
  description:
    "Permanently remove one or more todo items from the list by their IDs. Use this to delete todos that are no longer relevant, were created by mistake, or are duplicates. Unlike TodoComplete, removed todos are deleted entirely and won't appear in the list. The ids array accepts multiple todo IDs to remove several items at once. If any ID is invalid, an error is returned for that specific item. Returns the list of todos that were successfully removed.",
  inputSchema,
  outputSchema,
  execute: ({ ids }, { experimental_context }): TodoRemoveOutput => {
    const context = experimental_context as AgentContext;
    const results = ids.map((id) => context.removeTodo(id));

    const errors = results.filter((r) => r.kind === "Error");
    if (errors.length > 0) {
      return ToolResult.err(errors.map((e) => e.error).join("; "));
    }

    const todos = results
      .filter((r): r is Result<Todo> & { kind: "Ok" } => r.kind === "Ok")
      .map((r) => r.value);
    return ToolResult.ok({
      message: `Removed ${todos.length} ${pluralize(todos.length, "todo")}`,
      todos,
    });
  },
  toModelOutput: ({ output }) => {
    switch (output.kind) {
      case "Ok": {
        const value = output.value as TodoRemoveValue & { message: string };
        return {
          type: "text",
          value: withReadableTodosText(value.message, value.todos),
        };
      }
      case "Error":
        return {
          type: "text",
          value: `Failed to remove todos: ${output.error.message}`,
        };
      default:
        return {
          type: "text",
          value: "Unknown error",
        };
    }
  },
});
