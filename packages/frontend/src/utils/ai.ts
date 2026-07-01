import { type LanguageModelV3 } from "@ai-sdk/provider";
import {
  createModelKey,
  type Model,
  ModelProvider,
  type ModelProvider as ModelProviderId,
  supportsProviderReasoning,
} from "shared";

import type { FrontendSDK } from "../types";

import { isPresent } from "./optional";

export function getConfiguredProviderIds(sdk: FrontendSDK): string[] {
  return sdk.ai.getUpstreamProviders().map((provider) => provider.id);
}

export function getAvailableProviderIds(sdk: FrontendSDK): string[] {
  const known: string[] = Object.values(ModelProvider);
  const configured = getConfiguredProviderIds(sdk);
  return [...new Set([...known, ...configured])];
}

export function isProviderConfigured(sdk: FrontendSDK, provider: ModelProviderId): boolean {
  return getConfiguredProviderIds(sdk).includes(provider);
}

export function isAnyProviderConfigured(sdk: FrontendSDK): boolean {
  return getConfiguredProviderIds(sdk).length > 0;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: ModelProviderId) {
    super(`Provider "${provider}" is not configured. Please configure it in Caido AI settings.`);
    this.name = "ProviderNotConfiguredError";
  }
}

type CreateModelOptions = {
  structuredOutput?: boolean;
  reasoning?: boolean;
  reasoningEffort?: ReasoningEffort;
  openRouterPrioritizeFastProviders?: boolean;
};

export type ReasoningEffort = "low" | "medium" | "high";

export function createModel(sdk: FrontendSDK, model: Model, options: CreateModelOptions = {}) {
  const {
    structuredOutput = true,
    reasoning = true,
    reasoningEffort = "medium",
    openRouterPrioritizeFastProviders = false,
  } = options;

  const isReasoningModel =
    reasoning &&
    (model?.capabilities.reasoning ?? false) &&
    supportsProviderReasoning(model.provider);

  const provider = sdk.ai.createProvider();

  let modelId = model.id.split(":thinking")[0];
  if (!isPresent(modelId)) {
    throw new Error(`Invalid model ID: ${model.id}`);
  }

  if (model.provider === ModelProvider.OpenRouter && openRouterPrioritizeFastProviders) {
    modelId = `${modelId}:nitro`;
  }

  const modelKey = createModelKey(model.provider, modelId);
  const caidoModel = provider(modelKey, {
    ...(isReasoningModel && {
      reasoning: {
        effort: reasoningEffort,
      },
    }),
    capabilities: {
      reasoning: isReasoningModel,
      structured_output: structuredOutput,
    },
  }) as unknown as LanguageModelV3;

  return caidoModel;
}

const PREFERRED_AGENT_MODELS = [
  "openrouter/openai/gpt-5.5",
  "openai/gpt-5.5",
  "openrouter/anthropic/claude-sonnet-4.6",
  "openrouter/google/gemini-3.1-pro-preview-customtools",
  "anthropic/claude-sonnet-4-6",
  "google/gemini-3.1-pro-preview-customtools",
];

const PREFERRED_FLOAT_MODELS = [
  "openrouter/google/gemini-3-flash-preview",
  "openrouter/anthropic/claude-sonnet-4.6",
  "google/gemini-3-flash-preview",
  "anthropic/claude-sonnet-4-6",
];

type ResolveModelOptions = {
  sdk: FrontendSDK;
  savedModelKey: string | undefined;
  enabledModels: Model[];
  usageType: "agent" | "float";
};

export function resolveModel(options: ResolveModelOptions): Model | undefined {
  const { sdk, savedModelKey, enabledModels, usageType } = options;

  const findModelByKey = (key: string): Model | undefined => {
    return enabledModels.find((m) => createModelKey(m.provider, m.id) === key);
  };

  if (savedModelKey !== undefined && savedModelKey !== "") {
    const savedModel = findModelByKey(savedModelKey);
    if (savedModel !== undefined && isProviderConfigured(sdk, savedModel.provider)) {
      return savedModel;
    }
  }

  const preferredModels = usageType === "agent" ? PREFERRED_AGENT_MODELS : PREFERRED_FLOAT_MODELS;
  for (const key of preferredModels) {
    const model = findModelByKey(key);
    if (model !== undefined && isProviderConfigured(sdk, model.provider)) {
      return model;
    }
  }

  return enabledModels.find((m) => isProviderConfigured(sdk, m.provider));
}
