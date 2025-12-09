import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";
import { getCurrentRequestID } from "@/utils";

const InputSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the finding. This should be a short and concise title that captures the finding.",
    ),
  description: z
    .string()
    .describe(
      "The description of the finding. This supports markdown. When writing finding descriptions, keep it short and concise while still providing enough context to understand the finding.",
    ),
});

export const createFindingTool = tool({
  description: "Create a new finding",
  inputSchema: InputSchema,
  execute: async ({ title, description }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const requestID = await getCurrentRequestID(sdk);
      if (requestID === undefined) {
        return {
          success: false,
          error: "No request found to create a finding for",
        };
      }

      const finding = await sdk.findings.createFinding(requestID, {
        title,
        description,
        reporter: "Shift Agent",
      });

      if (finding === undefined) {
        return {
          success: false,
          error: "Failed to create finding",
        };
      }

      return actionSuccess("Created finding");
    } catch (error) {
      return actionError("Failed to create finding", error);
    }
  },
});
