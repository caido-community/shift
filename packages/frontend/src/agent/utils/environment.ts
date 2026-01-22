import type { FrontendSDK } from "@/types";

export type EnvironmentData = {
  name: string;
  variables: { name: string; value: string }[];
};

type VariableLookup = (envName: string, varName: string) => string | undefined;

const ENV_VAR_PATTERN = /§§§([^§]+)§([^§]+)§§§/g;

export function substituteEnvironmentVariables(text: string, lookup: VariableLookup): string {
  return text.replace(ENV_VAR_PATTERN, (match, envName: string, varName: string) => {
    const value = lookup(envName, varName);
    return value ?? match;
  });
}

export function createVariableLookup(environments: EnvironmentData[]): VariableLookup {
  const envMap = new Map<string, Map<string, string>>();

  for (const env of environments) {
    const varMap = new Map<string, string>();
    for (const variable of env.variables) {
      varMap.set(variable.name, variable.value);
    }
    envMap.set(env.name, varMap);
  }

  return (envName: string, varName: string): string | undefined => {
    return envMap.get(envName)?.get(varName);
  };
}

export async function resolveEnvironmentVariables(sdk: FrontendSDK, text: string): Promise<string> {
  const matches = [...text.matchAll(ENV_VAR_PATTERN)];
  if (matches.length === 0) {
    return text;
  }

  const envNames = new Set(matches.map((m) => m[1]));

  const environmentsResult = await sdk.graphql.environments();
  const relevantEnvs = environmentsResult.environments.filter((env) => envNames.has(env.name));

  const environments: EnvironmentData[] = await Promise.all(
    relevantEnvs.map(async (env) => {
      const envResult = await sdk.graphql.environment({ id: env.id });
      return {
        name: env.name,
        variables:
          envResult.environment?.variables.map((v) => ({
            name: v.name,
            value: v.value,
          })) ?? [],
      };
    })
  );

  const lookup = createVariableLookup(environments);
  return substituteEnvironmentVariables(text, lookup);
}
