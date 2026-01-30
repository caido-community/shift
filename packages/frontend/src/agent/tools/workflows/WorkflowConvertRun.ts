import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const inputSchema = z.object({
  id: z.string().min(1).describe("Convert workflow ID to run"),
  input: z.string().describe("Input data for the workflow"),
});

const valueSchema = z.object({
  output: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type WorkflowConvertRunInput = z.infer<typeof inputSchema>;
type WorkflowConvertRunValue = z.infer<typeof valueSchema>;
type WorkflowConvertRunOutput = ToolResultType<WorkflowConvertRunValue>;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Running " }, { text: input.id, muted: true }]
      : [{ text: "Running " }, { text: "convert workflow", muted: true }],
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Ran " }, { text: "convert workflow", muted: true }];
    }
    return [{ text: "Retrieved " }, { text: "workflow output", muted: true }];
  },
  error: ({ input }) =>
    input ? `Failed to run workflow ${input.id}` : "Failed to run convert workflow",
} satisfies ToolDisplay<WorkflowConvertRunInput, WorkflowConvertRunValue>;

export const WorkflowConvertRun = tool({
  description:
    "Run a convert workflow by ID with the provided input. Use this to transform bytes (for example, base64 or JWT transforms) without executing arbitrary code.",
  inputSchema,
  outputSchema,
  execute: async ({ id, input }, { experimental_context }): Promise<WorkflowConvertRunOutput> => {
    const context = experimental_context as AgentContext;
    const result = await context.sdk.graphql.runConvertWorkflow({ id, input });
    const error = result.runConvertWorkflow.error;
    if (isPresent(error)) {
      const detail =
        error.__typename === "WorkflowUserError"
          ? error.message
          : error.__typename === "PermissionDeniedUserError"
            ? error.permissionDeniedReason
            : error.code;
      return ToolResult.err("Convert workflow failed", detail);
    }

    const output = result.runConvertWorkflow.output ?? "";
    return ToolResult.ok({ message: "Convert workflow executed", output });
  },
});
