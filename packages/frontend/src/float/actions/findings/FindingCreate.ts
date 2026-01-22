import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { getCurrentRequestID } from "@/utils";

const inputSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the finding. This should be a short and concise title that captures the finding."
    ),
  description: z
    .string()
    .describe(
      "The description of the finding. This supports markdown. When writing finding descriptions, keep it short and concise while still providing enough context to understand the finding."
    ),
});

export const findingCreateTool = tool({
  description: "Create a new finding",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ title, description }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const result = await getCurrentRequestID(sdk);

    if (result.kind === "Error") {
      return ActionResult.err(`getCurrentRequestID error: ${result.error}`);
    }

    const requestID = result.value;

    const finding = await sdk.findings.createFinding(requestID, {
      title,
      description,
      reporter: "Shift Agent",
    });

    if (finding === undefined) {
      return ActionResult.err("Failed to create finding");
    }

    return ActionResult.ok("Created finding");
  },
});
