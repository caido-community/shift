import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { getCurrentRequestID } from "@/utils";

export const createFindingSchema = z.object({
  name: z.literal("createFinding"),
  parameters: z.object({
    title: z
      .string()
      .describe(
        "The title of the finding. This should be a short and concise title that captures the finding.",
      ),
    description: z
      .string()
      .describe(
        "The description of the finding. This supports markdown. When writing finding descriptions, keep it short and concise while still providing enough context to understand the finding.",
      )
  }),
});

export type createFindingInput = z.infer<typeof createFindingSchema>;

export const createFinding: ActionDefinition<createFindingInput> = {
  name: "createFinding",
  description: "Create a new finding",
  inputSchema: createFindingSchema,
  execute: async (
    sdk: FrontendSDK,
    { title, description }: createFindingInput["parameters"],
  ) => {
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
};
