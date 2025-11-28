import { z } from "zod";

import { actionError, hostedFileConfirmation } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const createHostedFileAdvancedSchema = z.object({
  name: z.literal("createHostedFileAdvanced"),
  parameters: z.object({
    file_name: z.string().describe("Name of the file to create (non-empty)"),
    js_script: z
      .string()
      .describe(
        "JavaScript code to execute. The result will be used as file content",
      ),
  }),
});

export type CreateHostedFileAdvancedInput = z.infer<
  typeof createHostedFileAdvancedSchema
>;

export const createHostedFileAdvanced: ActionDefinition<CreateHostedFileAdvancedInput> =
  {
    name: "createHostedFileAdvanced",
    description:
      "Create a hosted file by executing JavaScript code to generate content. Use this for generating large payloads, sequences (e.g., 100 numbers), encoded data, or complex wordlists. For simple wordlists with few lines, use the basic createHostedFile tool instead.",
    inputSchema: createHostedFileAdvancedSchema,
    execute: (
      sdk: FrontendSDK,
      { file_name, js_script }: CreateHostedFileAdvancedInput["parameters"],
    ) => {
      try {
        let content: string;

        try {
          const result = eval(js_script);
          content = String(result);
        } catch (evalError) {
          return actionError("Failed to execute JavaScript", evalError);
        }

        hostedFileConfirmation(sdk, {
          fileName: file_name,
          content,
        });

        return {
          success: true,
          frontend_message: "",
        };
      } catch (error) {
        return actionError("Failed to create hosted file", error);
      }
    },
  };
