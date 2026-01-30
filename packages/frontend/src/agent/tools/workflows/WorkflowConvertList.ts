import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const inputSchema = z.object({});

const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

const valueSchema = z.object({
  workflows: z.array(workflowSchema),
});

const outputSchema = ToolResult.schema(valueSchema);

type WorkflowConvertListInput = z.infer<typeof inputSchema>;
type WorkflowConvertListValue = z.infer<typeof valueSchema>;
type WorkflowConvertListOutput = ToolResultType<WorkflowConvertListValue>;

export const display = {
  streaming: () => [{ text: "Loading " }, { text: "convert workflows", muted: true }],
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Loaded " }, { text: "convert workflows", muted: true }];
    }
    return [
      { text: "Loaded " },
      { text: `${output.workflows.length} convert workflows`, muted: true },
    ];
  },
  error: () => "Failed to load convert workflows",
} satisfies ToolDisplay<WorkflowConvertListInput, WorkflowConvertListValue>;

export const WorkflowConvertList = tool({
  description:
    "List all available convert workflows. Convert workflows take bytes as input and output a transformed string. Use this to discover available workflows and their IDs before running one.",
  inputSchema,
  outputSchema,
  execute: (_input, { experimental_context }): WorkflowConvertListOutput => {
    const context = experimental_context as AgentContext;
    const workflows = context.sdk.workflows
      .getWorkflows()
      .filter((workflow) => workflow.kind === "Convert")
      .map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
      }));

    const message =
      workflows.length === 0
        ? "No convert workflows found"
        : `Found ${workflows.length} convert workflows`;

    return ToolResult.ok({ message, workflows });
  },
});
