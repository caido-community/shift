import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const UpdateTodoSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).optional(),
  status: z.enum(["pending", "completed"]).optional(),
});

export const updateTodoTool = tool({
  description: "Update an existing todo item by ID",
  inputSchema: UpdateTodoSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    const { todoManager } = context;

    const todos = todoManager.getTodos();
    const existingTodo = todos.find((todo) => todo.id === input.id);

    if (existingTodo === undefined) {
      return { error: `Todo with ID ${input.id} not found` };
    }

    const updatedTodo = {
      ...existingTodo,
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    todoManager.updateTodo(input.id, updatedTodo);

    return {
      message: "Todo updated successfully",
      todo: updatedTodo,
    };
  },
});
