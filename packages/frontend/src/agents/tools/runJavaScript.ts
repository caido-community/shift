import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";
import {
  fetchAgentEnvironmentById,
  fetchAgentEnvironments,
  findAgentEnvironment,
} from "@/agents/utils/environment";

type UpdateEnvironmentMutation =
  ToolContext["sdk"]["graphql"]["updateEnvironment"];
type UpdateEnvironmentArgs = Parameters<UpdateEnvironmentMutation>[0];
type UpdateEnvironmentInput = UpdateEnvironmentArgs extends {
  input: infer Input;
}
  ? Input
  : never;
type EnvironmentVariableInput = UpdateEnvironmentInput extends {
  variables: Array<infer Variable>;
}
  ? Variable
  : never;

const RunJavaScriptSchema = z.object({
  code: z
    .string()
    .min(1)
    .describe(
      "The JavaScript code to execute. This is being run in user's browser, so make sure to use only safe functions.",
    ),
  storeOutput: z
    .string()
    .optional()
    .describe(
      "Optional. Store the output in an environment variable. Format: EnvironmentName.variableName (e.g., Global.x).",
    ),
});

export const runJavaScriptTool = tool({
  description:
    "Execute JavaScript code for data processing, encoding/decoding, calculations, or string manipulation. Use this when you need to transform data, decode Base64, parse JSON, parse URLs, generate timestamps, or perform complex logic that other tools cannot handle.",
  inputSchema: RunJavaScriptSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const result = eval(input.code);
      let resultString: string;
      if (typeof result === "string") {
        resultString = result;
      } else {
        try {
          resultString = JSON.stringify(result, null, 2);
        } catch {
          resultString = String(result);
        }
      }

      const response: { result: string; stored?: string; error?: string } = {
        result: resultString,
      };

      // Store output if requested
      if (input.storeOutput !== undefined) {
        const parts = input.storeOutput.split(".");
        if (parts.length !== 2) {
          response.error = `Invalid storeOutput format. Expected EnvironmentName.variableName, got: ${input.storeOutput}`;
          return response;
        }

        const [environmentName, variableName] = parts;
        if (!environmentName || !variableName) {
          response.error = `Invalid storeOutput format. Expected EnvironmentName.variableName, got: ${input.storeOutput}`;
          return response;
        }
        const { sdk } = context;

        const environments = await fetchAgentEnvironments(sdk);
        const environment = findAgentEnvironment(environments, {
          name: environmentName,
        });

        if (environment === undefined) {
          response.error = `Environment '${environmentName}' not found.`;
          return response;
        }

        const resolvedEnvironmentId = environment.id.startsWith("name:")
          ? undefined
          : environment.id;

        if (resolvedEnvironmentId === undefined) {
          response.error = `Unable to resolve environment ID for '${environmentName}'. Try specifying the environment by its ID instead of name.`;
          return response;
        }

        const latestEnvironment =
          (await fetchAgentEnvironmentById(sdk, resolvedEnvironmentId)) ??
          environment;

        if (latestEnvironment.version === undefined) {
          response.error = `Environment version unavailable for '${environmentName}'; cannot perform update.`;
          return response;
        }

        const versionValue = Number(latestEnvironment.version);

        if (!Number.isFinite(versionValue)) {
          response.error = `Environment version is invalid for '${environmentName}'; cannot perform update.`;
          return response;
        }

        const variableKey = variableName.toLowerCase();
        const existingVariables = latestEnvironment.variables.slice();
        const toGraphQLVariables = (
          variables: typeof existingVariables,
        ): EnvironmentVariableInput[] =>
          variables.map((variable) => ({
            name: variable.name,
            value: variable.value,
            kind: (variable.kind ??
              "PLAIN") as EnvironmentVariableInput["kind"],
          }));

        const nextVariable = {
          name: variableName,
          value: resultString,
          kind: "PLAIN" as const,
        };

        const index = existingVariables.findIndex(
          (variable) => variable.name.toLowerCase() === variableKey,
        );

        if (index >= 0) {
          existingVariables[index] = nextVariable;
        } else {
          existingVariables.push(nextVariable);
        }

        await sdk.graphql.updateEnvironment({
          id: resolvedEnvironmentId,
          input: {
            name: latestEnvironment.name,
            version: versionValue,
            variables: toGraphQLVariables(existingVariables),
          },
        });

        response.stored = `Output stored in ${environmentName}.${variableName}`;
      }

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `JavaScript evaluation failed: ${message}` };
    }
  },
});
