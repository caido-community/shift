import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const UpdateTodoSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).optional(),
  status: z.enum(["pending", "completed"]).optional(),
});

export const updateTodoTool = tool({
  description: `The updateTodo tool is used to update an existing todo item by ID.
  You can update the content of the todo item, or mark it as completed.
  You can also update the internal content of the todo item that only you see, this is not visible to the user.
  Use this if you want to track some more information about the todo item, like the request schema, endpoint, parameter you want to send, etc.`,
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
