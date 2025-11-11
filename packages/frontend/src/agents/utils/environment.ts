import { type FrontendSDK } from "@/types";

type GraphQLEnvironmentVariable = {
  name?: string;
  value?: string;
  kind?: string;
};

type GraphQLEnvironmentEdge = {
  node?: GraphQLEnvironment;
};

type GraphQLEnvironmentCollection =
  | {
      nodes?: Array<GraphQLEnvironment | undefined>;
      edges?: Array<GraphQLEnvironmentEdge | undefined>;
    }
  | Array<GraphQLEnvironment | undefined>
  | undefined;

type GraphQLEnvironment = {
  id?: string;
  name?: string;
  version?: string | number;
  variables?: Array<GraphQLEnvironmentVariable | undefined>;
};

type EnvironmentContextPayload = {
  selected?: GraphQLEnvironment;
  global?: GraphQLEnvironment;
  environments?: GraphQLEnvironmentCollection;
  recent?: GraphQLEnvironmentCollection;
  all?: GraphQLEnvironmentCollection;
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

const coerceEnvironmentVariable = (
  value: unknown,
): GraphQLEnvironmentVariable | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return value as GraphQLEnvironmentVariable;
};

const coerceEnvironment = (value: unknown): GraphQLEnvironment | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return value as GraphQLEnvironment;
};

const normalizeVariable = (
  variable: GraphQLEnvironmentVariable | undefined,
): AgentEnvironmentVariable | undefined => {
  if (variable === undefined) {
    return undefined;
  }

  const { name, value, kind } = variable;

  if (typeof name !== "string" || name.length === 0) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  return {
    name,
    value,
    kind: typeof kind === "string" && kind.length > 0 ? kind : undefined,
  };
};

const normalizeEnvironment = (
  environment: GraphQLEnvironment | undefined,
): AgentEnvironment | undefined => {
  if (environment === undefined) {
    return undefined;
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
    return undefined;
  }

  const cleanVariables = Array.isArray(variables)
    ? variables.reduce<AgentEnvironmentVariable[]>((accumulator, entry) => {
        const normalized = normalizeVariable(coerceEnvironmentVariable(entry));
        if (normalized !== undefined) {
          accumulator.push(normalized);
        }
        return accumulator;
      }, [])
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

const collectNodes = (value: unknown): GraphQLEnvironment[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((node) => coerceEnvironment(node))
      .filter((node): node is GraphQLEnvironment => node !== undefined);
  }

  if (!isRecord(value)) {
    return [];
  }

  const nodes: GraphQLEnvironment[] = [];
  const { nodes: rawNodes, edges: rawEdges } = value as {
    nodes?: unknown;
    edges?: unknown;
  };

  if (Array.isArray(rawNodes)) {
    for (const node of rawNodes) {
      const normalized = coerceEnvironment(node);
      if (normalized !== undefined) {
        nodes.push(normalized);
      }
    }
  }

  if (Array.isArray(rawEdges)) {
    for (const edge of rawEdges) {
      if (!isRecord(edge)) {
        continue;
      }
      const normalized = coerceEnvironment(
        (edge as GraphQLEnvironmentEdge | undefined)?.node,
      );
      if (normalized !== undefined) {
        nodes.push(normalized);
      }
    }
  }

  return nodes;
};

export const fetchAgentEnvironmentById = async (
  sdk: FrontendSDK,
  id: string,
): Promise<AgentEnvironment | undefined> => {
  try {
    const result = await sdk.graphql.environment({ id });
    const environment = coerceEnvironment(
      (result as { environment?: unknown })?.environment,
    );
    return normalizeEnvironment(environment);
  } catch {
    return undefined;
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

    const registerEnvironment = (candidate: GraphQLEnvironment | undefined) => {
      const normalized = normalizeEnvironment(candidate);
      if (normalized === undefined) {
        return;
      }

      candidateMap.set(normalized.id, normalized);
      if (!normalized.id.startsWith("name:")) {
        detailedIds.add(normalized.id);
      }
    };

    registerEnvironment(coerceEnvironment(context.selected));
    registerEnvironment(coerceEnvironment(context.global));

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
      if (environment === undefined) {
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
): AgentEnvironment | undefined => {
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

  return environments.find(matches) ?? undefined;
};

export const findAgentEnvironmentVariable = (
  environment: AgentEnvironment,
  variableName: string,
): AgentEnvironmentVariable | undefined => {
  const target = variableName.toLowerCase();
  return environment.variables.find(
    (variable) => variable.name.toLowerCase() === target,
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
