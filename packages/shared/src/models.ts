import { type AIUpstreamProviderId } from "@caido/sdk-frontend";
import { z } from "zod";

import { isPresent } from "../../frontend/src/utils/optional";

export const ModelProvider = {
  OpenRouter: "openrouter",
  OpenAI: "openai",
  Anthropic: "anthropic",
  Google: "google",
} as const satisfies Record<string, AIUpstreamProviderId>;

export type ModelProvider = (typeof ModelProvider)[keyof typeof ModelProvider];
const ModelProviderSchema = z.nativeEnum(ModelProvider);

const ModelCapabilitiesSchema = z.object({
  reasoning: z.boolean(),
});
export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;

const ModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: ModelProviderSchema,
  capabilities: ModelCapabilitiesSchema,
});
export type Model = z.infer<typeof ModelSchema>;

const ModelUsageTypeSchema = z.enum(["agent", "float"]);
export type ModelUsageType = z.infer<typeof ModelUsageTypeSchema>;

const ModelUserConfigSchema = z.object({
  modelKey: z.string().min(1),
  enabled: z.boolean(),
  enabledFor: z.array(ModelUsageTypeSchema),
});
export type ModelUserConfig = z.infer<typeof ModelUserConfigSchema>;

const ModelsConfigSchema = z.object({
  models: z.array(ModelSchema),
  config: z.record(z.string(), ModelUserConfigSchema),
  customModelKeys: z.array(z.string()),
});
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>;

const ConfigOverrideSchema = z.object({
  enabled: z.boolean().optional(),
  enabledFor: z.array(ModelUsageTypeSchema).optional(),
});
export type ConfigOverride = z.infer<typeof ConfigOverrideSchema>;

const ModelsUserDataSchema = z.object({
  customModels: z.array(ModelSchema),
  configOverrides: z.record(z.string(), ConfigOverrideSchema),
});
export type ModelsUserData = z.infer<typeof ModelsUserDataSchema>;

type ModelKey = `${ModelProvider}/${string}`;

export const createModelKey = (provider: ModelProvider, id: string): ModelKey => {
  return `${provider}/${id}`;
};

export const parseModelKey = (key: string): { provider: ModelProvider; id: string } => {
  const [provider, id] = key.split("/", 2);
  if (!isPresent(provider) || !isPresent(id)) {
    throw new Error(`Invalid model key: ${key}`);
  }

  return { provider: provider as ModelProvider, id };
};

export const AddModelSchema = ModelSchema;
export type AddModelInput = z.infer<typeof AddModelSchema>;

export const RemoveModelSchema = z.object({
  provider: ModelProviderSchema,
  id: z.string().min(1),
});
export type RemoveModelInput = z.infer<typeof RemoveModelSchema>;

export const UpdateModelConfigSchema = z.object({
  enabled: z.boolean().optional(),
  enabledFor: z.array(ModelUsageTypeSchema).optional(),
});
export type UpdateModelConfigInput = z.infer<typeof UpdateModelConfigSchema>;

export const UpdateModelEnabledForSchema = z.object({
  enabledFor: z.array(ModelUsageTypeSchema),
});
export type UpdateModelEnabledForInput = z.infer<typeof UpdateModelEnabledForSchema>;
