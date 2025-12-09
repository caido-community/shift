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
    .describe("The name of the environment variable to set (non-empty)."),
  value: z.string().describe("The value assigned to the environment variable."),
  kind: z
    .string()
    .describe(
      "The kind of the environment variable. Use PLAIN if not specified.",
    ),
});

const createEnvironmentSchema = z.object({
  name: z.literal("createEnvironment"),
  parameters: z.object({
    environmentName: z
      .string()
      .describe("The name of the environment to create (non-empty)."),
    variables: z
      .array(environmentVariableSchema)
      .describe(
        "List of variables that will be created alongside the environment. Use empty array if none.",
      ),
  }),
});

type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;

export const createEnvironment: ActionDefinition<CreateEnvironmentInput> = {
  name: "createEnvironment",
  description:
    "Create a new environment optionally pre-populated with variables",
  inputSchema: createEnvironmentSchema,
  execute: async (
    sdk: FrontendSDK,
    { environmentName, variables }: CreateEnvironmentInput["parameters"],
  ) => {
    try {
      const result = await sdk.graphql.createEnvironment({
        input: {
          name: environmentName,
          variables: variables.map(normalizeEnvironmentVariable),
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
