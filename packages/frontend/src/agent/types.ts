import { type Result } from "shared";
import { z } from "zod";

const todoStatusSchema = z.enum(["pending", "in_progress", "completed"]);

export const todoSchema = z.object({
  id: z.number().int().positive(),
  content: z.string(),
  status: todoStatusSchema,
});

export type Todo = z.infer<typeof todoSchema>;

export function isTodoCompleted(todo: Pick<Todo, "status">): boolean {
  return todo.status === "completed";
}

export function isTodoInProgress(todo: Pick<Todo, "status">): boolean {
  return todo.status === "in_progress";
}

export type QueuedMessage = {
  id: string;
  text: string;
  createdAt: number;
};

export type FrontendError = {
  message: string;
  detail?: string;
};

const frontendErrorSchema = z.object({
  message: z.string(),
  detail: z.string().optional(),
});

type MessageOnly = { message: string };
type WithMessage<T> = T & MessageOnly;

export type ToolResult<TValue = undefined> = Result<
  TValue extends undefined ? MessageOnly : WithMessage<TValue>,
  FrontendError
>;

export const ToolResult = {
  schema: <T extends z.ZodTypeAny>(valueSchema?: T) =>
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("Ok"),
        value: valueSchema
          ? valueSchema.and(z.object({ message: z.string() }))
          : z.object({ message: z.string() }),
      }),
      z.object({
        kind: z.literal("Error"),
        error: frontendErrorSchema,
      }),
    ]),
  ok: <TValue = undefined>(
    value: TValue extends undefined ? MessageOnly : WithMessage<TValue>
  ): ToolResult<TValue> => ({
    kind: "Ok",
    value,
  }),
  err: <TValue = never>(message: string, detail?: string): ToolResult<TValue> => ({
    kind: "Error",
    error: { message, detail },
  }),
};

type MessagePart = { text: string; muted?: boolean };
export type MessageResult = MessagePart[];

export type ToolDisplayContext<TInput, TOutput> = {
  input: TInput | undefined;
  output: TOutput | undefined;
};

export type ToolDisplay<TInput, TOutput = undefined> = {
  streaming: (context: ToolDisplayContext<TInput, TOutput>) => MessageResult;
  success: (context: ToolDisplayContext<TInput, TOutput>) => MessageResult;
  error: (context: ToolDisplayContext<TInput, TOutput>) => string;
};
