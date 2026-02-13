import { Result, type Result as ResultType } from "shared";

import type { FrontendSDK } from "@/types";

export type EnvironmentData = {
  name: string;
  variables: { name: string; value: string }[];
};

type EnvironmentLookup = (envName: string, varName: string) => string | undefined;
type PayloadBlobLookup = (blobId: string) => string | undefined;

const ENV_PLACEHOLDER_PATTERN = /§§§Env§([^§]+)§([^§]+)§§§/g;
const BLOB_PLACEHOLDER_PATTERN = /§§§Blob§([^§]+)§§§/g;

export function substituteEnvironmentPlaceholders(text: string, lookup: EnvironmentLookup): string {
  return text.replace(ENV_PLACEHOLDER_PATTERN, (match, envName: string, varName: string) => {
    const value = lookup(envName, varName);
    return value ?? match;
  });
}

export function createEnvironmentLookup(environments: EnvironmentData[]): EnvironmentLookup {
  const envMap = new Map<string, Map<string, string>>();

  for (const environment of environments) {
    const variableMap = new Map<string, string>();
    for (const variable of environment.variables) {
      variableMap.set(variable.name, variable.value);
    }
    envMap.set(environment.name, variableMap);
  }

  return (envName: string, varName: string): string | undefined => {
    return envMap.get(envName)?.get(varName);
  };
}

function substitutePayloadBlobPlaceholders(
  text: string,
  lookup: PayloadBlobLookup
): ResultType<string> {
  let missingBlobId: string | undefined;
  const resolved = text.replace(BLOB_PLACEHOLDER_PATTERN, (match, blobId: string) => {
    const value = lookup(blobId);
    if (value === undefined) {
      missingBlobId = blobId;
      return match;
    }
    return value;
  });

  if (missingBlobId !== undefined) {
    return Result.err(
      `Payload blob "${missingBlobId}" was not found in this run. Create it with PayloadBlobCreate and retry using the returned blobId.`
    );
  }

  return Result.ok(resolved);
}

export async function resolvePlaceholders(
  sdk: FrontendSDK,
  text: string,
  options?: {
    payloadBlobLookup?: PayloadBlobLookup;
  }
): Promise<ResultType<string>> {
  try {
    let resolvedText = text;

    const envMatches = [...resolvedText.matchAll(ENV_PLACEHOLDER_PATTERN)];
    if (envMatches.length > 0) {
      const envNames = new Set(envMatches.map((match) => match[1]));
      const environmentsResult = await sdk.graphql.environments();
      const relevantEnvironments = environmentsResult.environments.filter((environment) =>
        envNames.has(environment.name)
      );

      const environments: EnvironmentData[] = await Promise.all(
        relevantEnvironments.map(async (environment) => {
          const environmentResult = await sdk.graphql.environment({ id: environment.id });
          return {
            name: environment.name,
            variables:
              environmentResult.environment?.variables.map((variable) => ({
                name: variable.name,
                value: variable.value,
              })) ?? [],
          };
        })
      );

      const lookup = createEnvironmentLookup(environments);
      resolvedText = substituteEnvironmentPlaceholders(resolvedText, lookup);
    }

    const blobMatches = [...resolvedText.matchAll(BLOB_PLACEHOLDER_PATTERN)];
    if (blobMatches.length === 0) {
      return Result.ok(resolvedText);
    }

    if (options?.payloadBlobLookup === undefined) {
      return Result.err(
        "Payload blob placeholders are not available in this context. Create a blob with PayloadBlobCreate and retry with §§§Blob§blobId§§§."
      );
    }

    return substitutePayloadBlobPlaceholders(resolvedText, options.payloadBlobLookup);
  } catch (error) {
    return Result.err(error instanceof Error ? error.message : "Failed to resolve placeholders");
  }
}
