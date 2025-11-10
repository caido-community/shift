import { type FrontendSDK } from "@/types";

type GraphQLEnvironmentVariable = {
  name?: string | null;
  value?: string | null;
  kind?: string | null;
};

type GraphQLEnvironment = {
  id?: string | null;
  name?: string | null;
  version?: string | number | null;
  variables?: Array<GraphQLEnvironmentVariable | null | undefined> | null;
};

type EnvironmentContextPayload = {
  selected?: GraphQLEnvironment | null;
  global?: GraphQLEnvironment | null;
  environments?:
    | {
        nodes?: Array<GraphQLEnvironment | null | undefined> | null;
        edges?:
          | Array<
              | { node?: GraphQLEnvironment | null | undefined }
              | null
              | undefined
            >
          | null;
      }
    | Array<GraphQLEnvironment | null | undefined>
    | null;
  recent?:
    | {
        nodes?: Array<GraphQLEnvironment | null | undefined> | null;
        edges?:
          | Array<
              | { node?: GraphQLEnvironment | null | undefined }
              | null
              | undefined
            >
          | null;
      }
    | Array<GraphQLEnvironment | null | undefined>
    | null;
  all?:
    | {
        nodes?: Array<GraphQLEnvironment | null | undefined> | null;
        edges?:
          | Array<
              | { node?: GraphQLEnvironment | null | undefined }
              | null
              | undefined
            >
          | null;
      }
    | Array<GraphQLEnvironment | null | undefined>
    | null;
  [key: string]: unknown;
};

export type AgentEnvironmentVariable = {
  name: string;
  value: string;
  kind?: string;
};

export type AgentEnvironment = {
  id: string;
  name: string;
  version?: string | number;
  variables: AgentEnvironmentVariable[];
};

export type AgentEnvironmentSummary = {
  id: string;
  name: string;
  variableKeys: string[];
  totalVariables: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeVariable = (
  variable: GraphQLEnvironmentVariable | null | undefined,
): AgentEnvironmentVariable | null => {
  if (variable === null || variable === undefined) {
    return null;
  }

  const { name, value, kind } = variable;

  if (typeof name !== "string" || name.length === 0) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return {
    name,
    value,
    kind: typeof kind === "string" && kind.length > 0 ? kind : undefined,
  };
};

const normalizeEnvironment = (
  environment: GraphQLEnvironment | null | undefined,
): AgentEnvironment | null => {
  if (environment === null || environment === undefined) {
    return null;
  }

  const { id, name, version, variables } = environment;
  const resolvedName =
    typeof name === "string" && name.length > 0 ? name : undefined;
  const resolvedId =
    typeof id === "string" && id.length > 0
      ? id
      : resolvedName !== undefined
        ? `name:${resolvedName}`
        : undefined;

  if (resolvedId === undefined) {
    return null;
  }

  const cleanVariables = Array.isArray(variables)
    ? variables
        .map(normalizeVariable)
        .filter(
          (variable): variable is AgentEnvironmentVariable =>
            variable !== null,
        )
    : [];

  return {
    id: resolvedId,
    name: resolvedName ?? resolvedId,
    version:
      typeof version === "string" || typeof version === "number"
        ? version
        : undefined,
    variables: cleanVariables,
  };
};

const collectNodes = (
  value: EnvironmentContextPayload[keyof EnvironmentContextPayload],
): GraphQLEnvironment[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(
      (node): node is GraphQLEnvironment =>
        node !== null && node !== undefined,
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  const nodes: GraphQLEnvironment[] = [];

  if (Array.isArray(value.nodes)) {
    for (const node of value.nodes) {
      if (node !== null && node !== undefined) {
        nodes.push(node);
      }
    }
  }

  if (Array.isArray(value.edges)) {
    for (const edge of value.edges) {
      if (
        edge !== null &&
        edge !== undefined &&
        isRecord(edge) &&
        edge.node !== null &&
        edge.node !== undefined
      ) {
        nodes.push(edge.node as GraphQLEnvironment);
      }
    }
  }

  return nodes;
};

export const fetchAgentEnvironmentById = async (
  sdk: FrontendSDK,
  id: string,
): Promise<AgentEnvironment | null> => {
  try {
    const result = await sdk.graphql.environment({ id });
    const environment = (result as { environment?: GraphQLEnvironment })?.environment;
    return normalizeEnvironment(environment);
  } catch {
    return null;
  }
};

export const fetchAgentEnvironments = async (
  sdk: FrontendSDK,
): Promise<AgentEnvironment[]> => {
  try {
    const contextResult = await sdk.graphql.environmentContext();
    const context = (
      contextResult as { environmentContext?: EnvironmentContextPayload }
    )?.environmentContext;

    if (context === undefined || context === null) {
      return [];
    }

    const candidateMap = new Map<string, AgentEnvironment>();
    const detailedIds = new Set<string>();

    const registerEnvironment = (candidate: GraphQLEnvironment | null | undefined) => {
      const normalized = normalizeEnvironment(candidate);
      if (normalized === null) {
        return;
      }

      candidateMap.set(normalized.id, normalized);
      if (!normalized.id.startsWith("name:")) {
        detailedIds.add(normalized.id);
      }
    };

    registerEnvironment(context.selected ?? null);
    registerEnvironment(context.global ?? null);

    for (const key of Object.keys(context)) {
      const value = context[key as keyof EnvironmentContextPayload];
      if (value === null || value === undefined) {
        continue;
      }

      const nodes = collectNodes(value);
      for (const node of nodes) {
        registerEnvironment(node);
      }
    }

    const detailedResults = await Promise.all(
      Array.from(detailedIds.values()).map((id) =>
        fetchAgentEnvironmentById(sdk, id),
      ),
    );

    for (const environment of detailedResults) {
      if (environment === null) {
        continue;
      }
      candidateMap.set(environment.id, environment);
    }

    return Array.from(candidateMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } catch {
    return [];
  }
};

export const findAgentEnvironment = (
  environments: AgentEnvironment[],
  {
    id,
    name,
  }: {
    id?: string;
    name?: string;
  },
): AgentEnvironment | null => {
  const idLower = typeof id === "string" ? id.toLowerCase() : undefined;
  const nameLower = typeof name === "string" ? name.toLowerCase() : undefined;

  const matches = (environment: AgentEnvironment) => {
    if (idLower !== undefined) {
      if (
        environment.id.toLowerCase() === idLower ||
        environment.id.replace(/^name:/i, "").toLowerCase() === idLower
      ) {
        return true;
      }
    }

    if (nameLower !== undefined) {
      if (environment.name.toLowerCase() === nameLower) {
        return true;
      }
    }

    return false;
  };

  return environments.find(matches) ?? null;
};

export const findAgentEnvironmentVariable = (
  environment: AgentEnvironment,
  variableName: string,
): AgentEnvironmentVariable | null => {
  const target = variableName.toLowerCase();
  return (
    environment.variables.find(
      (variable) => variable.name.toLowerCase() === target,
    ) ?? null
  );
};

export const summarizeAgentEnvironments = (
  environments: AgentEnvironment[],
): AgentEnvironmentSummary[] =>
  environments.map((environment) => ({
    id: environment.id,
    name: environment.name,
    variableKeys: environment.variables.map((variable) => variable.name),
    totalVariables: environment.variables.length,
  }));


