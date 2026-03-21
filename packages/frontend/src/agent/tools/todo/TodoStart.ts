import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import {
  type Todo,
  todoSchema,
  type ToolDisplay,
  ToolResult,
  type ToolResult as ToolResultType,
} from "@/agent/types";
import { isPresent, truncate } from "@/utils";

const inputSchema = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("The ID of the todo item to mark as currently in progress"),
});

const valueSchema = z.object({
  todo: todoSchema,
});

const outputSchema = ToolResult.schema(valueSchema);

type TodoStartInput = z.infer<typeof inputSchema>;
type TodoStartValue = z.infer<typeof valueSchema>;
type TodoStartOutput = ToolResultType<TodoStartValue>;

const formatTodoPreview = (todo: Todo | undefined, id: number | undefined): string => {
  if (isPresent(todo)) {
    return truncate(todo.content, 52);
  }
  if (id !== undefined) {
    return String(id);
  }
  return "todo";
};

export const display = {
  streaming: ({ input }) => [
    { text: "Starting " },
    { text: formatTodoPreview(undefined, input?.id), muted: true },
  ],
  success: ({ input, output }) => [
    { text: "Now working on " },
    { text: formatTodoPreview(output?.todo, input?.id), muted: true },
  ],
  error: () => "Failed to start todo",
} satisfies ToolDisplay<TodoStartInput, TodoStartValue>;

export const TodoStart = tool({
  description:
    "Mark a single todo item as the task you are currently working on. Use this when you begin a step so the user can see your active focus in real time. Only one todo can be in progress at a time; starting a new one automatically moves any previously in-progress todo back to pending. Completed todos cannot be started again.",
  inputSchema,
  outputSchema,
  execute: ({ id }, { experimental_context }): TodoStartOutput => {
    const context = experimental_context as AgentContext;
    const result = context.startTodo(id);

    if (result.kind === "Error") {
      return ToolResult.err(result.error);
    }

    return ToolResult.ok({
      message: `Started todo ${result.value.id}`,
      todo: result.value,
    });
  },
});
