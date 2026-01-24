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
  content: z.array(z.string()).describe("The todo item contents/descriptions"),
});

const valueSchema = z.object({
  todos: z.array(todoSchema),
});

const outputSchema = ToolResult.schema(valueSchema);

type TodoAddInput = z.infer<typeof inputSchema>;
type TodoAddValue = z.infer<typeof valueSchema>;
type TodoAddOutput = ToolResultType<TodoAddValue>;

const formatTodoPreview = (content: string[] | undefined): string => {
  if (!isPresent(content) || content.length === 0) return "todos";
  const first = content[0];
  if (content.length === 1 && isPresent(first)) return truncate(first, 32);
  return `${content.length} ${pluralize(content.length, "todo")}`;
};

const formatTodoOutput = (todos: Todo[] | undefined): string => {
  if (!isPresent(todos) || todos.length === 0) return "todos";
  if (todos.length === 1 && isPresent(todos[0])) {
    return truncate(todos[0].content, 32);
  }
  return `${todos.length} ${pluralize(todos.length, "todo")}`;
};

export const display = {
  streaming: ({ input }) => [
    { text: "Creating " },
    { text: formatTodoPreview(input?.content), muted: true },
  ],
  success: ({ output }) => [
    { text: "Created " },
    {
      text: formatTodoOutput(output?.todos),
      muted: true,
    },
  ],
  error: () => "Failed to create todos",
} satisfies ToolDisplay<TodoAddInput, TodoAddValue>;

export const TodoAdd = tool({
  description:
    "Add one or more todo items to track tasks during the current session. Use this to break down complex security testing workflows into trackable steps, plan multi-stage attacks, or keep track of findings to investigate. Each todo item gets a unique ID that can be used with TodoComplete or TodoRemove. The content array accepts multiple items to create several todos at once. Todos persist for the duration of the agent session and help maintain focus on the testing objective.",
  inputSchema,
  outputSchema,
  execute: ({ content }, { experimental_context }): TodoAddOutput => {
    const context = experimental_context as AgentContext;
    const results = content.map((item) => context.addTodo(item));

    const errors = results.filter((r) => r.kind === "Error");
    if (errors.length > 0) {
      return ToolResult.err(errors.map((e) => e.error).join("; "));
    }

    const todos = results
      .filter((r): r is Result<Todo> & { kind: "Ok" } => r.kind === "Ok")
      .map((r) => r.value);
    return ToolResult.ok({
      message: `Created ${todos.length} ${pluralize(todos.length, "todo")}`,
      todos,
    });
  },
});
