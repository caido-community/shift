import { z } from "zod";

// Caido's default provider IDs; users can add providers under any alias.
export const ModelProvider = {
  OpenRouter: "openrouter",
  OpenAI: "openai",
  Anthropic: "anthropic",
  Google: "google",
} as const;

export type ModelProvider = (typeof ModelProvider)[keyof typeof ModelProvider] | (string & {});
const ModelProviderSchema = z.string().min(1);

const ModelCapabilitiesSchema = z.object({
  reasoning: z.boolean(),
});
export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;

export const MODEL_REASONING_EFFORTS = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
const ReasoningEffortSchema = z.enum(MODEL_REASONING_EFFORTS);
export type ModelReasoningEffort = z.infer<typeof ReasoningEffortSchema>;

const ModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: ModelProviderSchema,
  contextWindow: z.number().int().positive().optional(),
  capabilities: ModelCapabilitiesSchema,
  reasoningEfforts: z.array(ReasoningEffortSchema).optional(),
});
export type Model = z.infer<typeof ModelSchema>;

type ModelKey = `${ModelProvider}/${string}`;

export const createModelKey = (provider: ModelProvider, id: string): ModelKey => {
  return `${provider}/${id}`;
};
