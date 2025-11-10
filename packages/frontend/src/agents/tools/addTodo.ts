import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const AddTodoSchema = z.object({
  id: z.string().min(1),
  content: z
    .string()
    .min(1)
    .describe("The content of the todo item. Keep it short and concise."),
  internal_content: z
    .string()
    .optional()
    .describe(
      "This is optional internal content that only you see, this is not visible to the user. Use this if you want to track some more information about the todo item, like the request schema, endpoint, parameter you want to send, etc.",
    ),
});

export const addTodoTool = tool({
  description: `The addTodo tool is used to add a new todo item to the todo list.
  This is useful for tracking progress on complex security testing tasks.
  You can add a todo item with a short description of the task you want to perform.
  You can also add internal content to the todo item that only you see, this is not visible to the user.
  Use this if you want to track some more information about the todo item, like the request schema, endpoint, parameter you want to send, etc.
  
  It is very important to build out a thorough todo list before you start testing. This will help you stay organized and ensure you don't miss anything.`,
  inputSchema: AddTodoSchema,
  execute: (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    const todo = {
      id: input.id,
      content: input.content,
      internal_content: input.internal_content,
      status: "pending" as const,
    };
    context.todoManager.addTodo(todo);
    return { message: "Todo item added successfully", todo };
  },
});
