import { z } from "zod";

import { defaultFeatureFlags, FeatureFlagsConfigSchema } from "./feature-flags";

const RenamingConfigSchema = z.object({
  enabled: z.boolean(),
  renameAfterSend: z.boolean(),
  instructions: z.string(),
});
export type RenamingConfig = z.infer<typeof RenamingConfigSchema>;

export const BedrockCredentialsSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  region: z.string(),
});
export type BedrockCredentials = z.infer<typeof BedrockCredentialsSchema>;

const SettingsConfigSchema = z.object({
  agentsModel: z.string(),
  floatModel: z.string(),
  renamingModel: z.string(),
  maxIterations: z.number(),
  renaming: RenamingConfigSchema,
  debugToolsEnabled: z.boolean(),
  autoCreateShiftCollection: z.boolean(),
  openRouterPrioritizeFastProviders: z.boolean(),
  featureFlags: FeatureFlagsConfigSchema,
  bedrockCredentials: BedrockCredentialsSchema.optional(),
});
export type SettingsConfig = z.infer<typeof SettingsConfigSchema>;

export const defaultRenamingConfig: RenamingConfig = {
  enabled: false,
  renameAfterSend: false,
  instructions:
    "Include the HTTP Verb, and a concise version of the path in the tab name. Focus on the end of the path. Include only the first 4 characters of IDs.\nExample: GET /api/v1/users/{id}/profile\nUNLESS, the current request is a graphql request, then use the operationName if present.",
};

export const DEFAULT_MAX_ITERATIONS = 100;

export const defaultSettingsConfig: SettingsConfig = {
  agentsModel: "",
  floatModel: "",
  renamingModel: "",
  maxIterations: DEFAULT_MAX_ITERATIONS,
  renaming: defaultRenamingConfig,
  debugToolsEnabled: false,
  autoCreateShiftCollection: true,
  openRouterPrioritizeFastProviders: false,
  featureFlags: defaultFeatureFlags,
  bedrockCredentials: undefined,
};

export const UpdateSettingsSchema = z.object({
  agentsModel: z.string().optional(),
  floatModel: z.string().optional(),
  renamingModel: z.string().optional(),
  maxIterations: z.number().optional(),
  renaming: RenamingConfigSchema.partial().optional(),
  debugToolsEnabled: z.boolean().optional(),
  autoCreateShiftCollection: z.boolean().optional(),
  openRouterPrioritizeFastProviders: z.boolean().optional(),
  featureFlags: FeatureFlagsConfigSchema.partial().optional(),
  bedrockCredentials: BedrockCredentialsSchema.nullable().optional(),
});
export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
