import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";
import { substituteEnvironmentVariables } from "@/agents/utils/substituteEnvironmentVariables";

const SetRequestQuerySchema = z.object({
  name: z.string().min(1).describe("The query parameter name. Supports environment variable substitution."),
  value: z.string().describe("The query parameter value. Supports environment variable substitution."),
});

export const setRequestQueryTool = tool({
  description:
    "Add or update a query parameter in the current HTTP request URL. Use this when you need to modify GET parameters, add new ones, or change existing values. The parameter will be properly URL-encoded.",
  inputSchema: SetRequestQuerySchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const name = await substituteEnvironmentVariables(input.name, context);
      const value = await substituteEnvironmentVariables(input.value, context);
      
      const hasChanged = context.replaySession.updateRequestRaw((draft) => {
        return HttpForge.create(draft)
          .upsertQueryParam(name, value)
          .build();
      });

      return {
        message: hasChanged
          ? "Request has been updated"
          : "Request has not changed",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to set query parameter: ${message}` };
    }
  },
});
