import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const httpqlSetQuerySchema = z.object({
  name: z.literal("httpqlSetQuery"),
  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The query to set for the HTTPQL filter. Follow strictly HTTPQL syntax.",
      ),
  }),
});

export type HttpqlSetQueryInput = z.infer<typeof httpqlSetQuerySchema>;

export const httpqlSetQuery: ActionDefinition<HttpqlSetQueryInput> = {
  name: "httpqlSetQuery",
  description: "Set the query for the HTTPQL filter",
  inputSchema: httpqlSetQuerySchema,
  execute: (sdk: FrontendSDK, { query }: HttpqlSetQueryInput["parameters"]) => {
    try {
      sdk.httpHistory.setQuery(query);

      return {
        success: true,
        frontend_message: `Query set successfully`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to set query: ${error}`,
      };
    }
  },
};
