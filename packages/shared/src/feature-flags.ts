import { z } from "zod";

type FeatureFlagDefinition = {
  label: string;
  description: string;
  category: "experimental";
  defaultValue: boolean;
};

const defineFeatureFlags = <const T extends Record<string, FeatureFlagDefinition>>(
  definitions: T
) => {
  const entries = Object.entries(definitions) as Array<[key: keyof T, definition: T[keyof T]]>;

  const schemaShape = Object.fromEntries(entries.map(([key]) => [key, z.boolean()])) as Record<
    keyof T,
    z.ZodBoolean
  >;

  const defaults = Object.fromEntries(
    entries.map(([key, definition]) => [key, definition.defaultValue])
  ) as Record<keyof T, boolean>;

  return {
    definitions,
    entries: entries.map(([key, definition]) => ({
      key,
      ...definition,
    })),
    schema: z.object(schemaShape),
    defaults,
  };
};

const registry = defineFeatureFlags({
  backgroundAgents: {
    label: "(Experimental) Background Agents for Shift Float",
    description:
      "Allow Shift Float to delegate long-running tasks to background agents and show the background agent panel.",
    category: "experimental",
    defaultValue: false,
  },
});

export const FEATURE_FLAGS = registry.definitions;
export const featureFlagEntries = registry.entries;

export const FeatureFlagsConfigSchema = registry.schema;
export type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfigSchema>;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

export const defaultFeatureFlags: FeatureFlagsConfig = registry.defaults;

export const isFeatureFlagEnabled = (
  flags: Partial<FeatureFlagsConfig> | FeatureFlagsConfig | undefined,
  flag: FeatureFlagKey
): boolean => {
  return flags?.[flag] ?? defaultFeatureFlags[flag];
};
