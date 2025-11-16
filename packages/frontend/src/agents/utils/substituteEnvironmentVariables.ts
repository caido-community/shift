import { type ToolContext } from "@/agents/types";
import {
  fetchAgentEnvironments,
  findAgentEnvironment,
  findAgentEnvironmentVariable,
} from "@/agents/utils/environment";

/**
/**
 * Substitutes environment variable references in a string.
 * Pattern: `§§§EnvironmentName§Variable_Name§§§`
 * 
 * @param text - The text containing environment variable references
 * @param context - The tool context containing SDK for environment access
 * @returns The text with environment variables substituted, or original text if substitution fails
 */
export async function substituteEnvironmentVariables(
  text: string,
  context: ToolContext,
): Promise<string> {
  // Pattern to match §§§EnvironmentName§Variable_Name§§§
  const pattern = /§§§([^§]+)§([^§]+)§§§/g;

  // Find all matches
  const matches = Array.from(text.matchAll(pattern));

  if (matches.length === 0) {
    return text;
  }

  // Fetch all environments once
  const environments = await fetchAgentEnvironments(context.sdk);

  let result = text;

  // Process each match in reverse order to maintain indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    if (!match) {
      continue;
    }

    const fullMatch = match[0];
    const environmentName = match[1];
    const variableName = match[2];

    if (!environmentName || !variableName || match.index === undefined) {
      continue;
    }

    // Find the environment
    const environment = findAgentEnvironment(environments, {
      name: environmentName,
    });

    if (environment === undefined) {
      // Environment not found - leave as-is
      continue;
    }

    // Find the variable
    const variable = findAgentEnvironmentVariable(environment, variableName);

    if (variable === undefined) {
      // Variable not found - leave as-is
      continue;
    }

    // Replace the pattern with the variable value
    result =
      result.slice(0, match.index) +
      variable.value +
      result.slice(match.index + fullMatch.length);
  }

  return result;
}
