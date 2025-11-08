import { z } from "zod";

import {
  actionError,
  actionSuccess,
  normalizeEnvironmentVariable,
} from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const environmentVariableSchema = z.object({
  name: z
    .string()
    .min(1)
    .describe("The name of the environment variable to set."),
  value: z.string().describe("The value assigned to the environment variable."),
  kind: z
    .string()
    .min(1)
    .default("PLAIN")
    .describe(
      "The kind of the environment variable. Defaults to PLAIN if omitted.",
    ),
});

export const createEnvironmentSchema = z.object({
  name: z.literal("createEnvironment"),
  parameters: z.object({
    name: z.string().min(1).describe("The name of the environment to create."),
    variables: z
      .array(environmentVariableSchema)
      .optional()
      .describe(
        "Optional list of variables that will be created alongside the environment.",
      ),
  }),
});

export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;

export const createEnvironment: ActionDefinition<CreateEnvironmentInput> = {
  name: "createEnvironment",
  description: "Create a new environment optionally pre-populated with variables",
  inputSchema: createEnvironmentSchema,
  execute: async (
    sdk: FrontendSDK,
    { name, variables }: CreateEnvironmentInput["parameters"],
  ) => {
    try {
      const result = await sdk.graphql.createEnvironment({
        input: {
          name,
          variables: (variables ?? []).map(normalizeEnvironmentVariable),
        },
      });

      const environment = result?.createEnvironment?.environment;

      if (environment === undefined || environment === null) {
        return {
          success: false,
          error: "Failed to create environment",
        };
      }

      return actionSuccess(
        `Environment ${environment.name} created successfully`,
      );
    } catch (error) {
      return actionError("Failed to create environment", error);
    }
  },
};

