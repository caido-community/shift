import { type LanguageModelV3, type LanguageModelV3Middleware } from "@ai-sdk/provider";
import { type AILanguageModelSettings } from "@caido/sdk-frontend";
import { wrapLanguageModel } from "ai";
import {
  createModelKey,
  type Model,
  MODEL_REASONING_EFFORTS,
  ModelProvider,
  type ModelProvider as ModelProviderId,
  type ModelReasoningEffort,
} from "shared";

import type { FrontendSDK } from "../types";

import { listCaidoModels, listUpstreamProviders } from "./caidoAi";

export function isProviderConfigured(sdk: FrontendSDK, provider: ModelProviderId): boolean {
  return listUpstreamProviders(sdk).some((s) => s.id === provider);
}

export function isAnyProviderConfigured(sdk: FrontendSDK): boolean {
  return listUpstreamProviders(sdk).length > 0;
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: ModelProviderId) {
    super(`Provider "${provider}" is not configured. Please configure it in Caido AI settings.`);
    this.name = "ProviderNotConfiguredError";
  }
}

type CreateModelOptions = {
  reasoning?: boolean;
  reasoningEffort?: ReasoningEffort;
  openRouterPrioritizeFastProviders?: boolean;
};

export type ReasoningEffort = ModelReasoningEffort;

function toWellFormed<T>(value: T): T {
  if (typeof value === "string") return value.toWellFormed() as T;
  if (Array.isArray(value)) return value.map(toWellFormed) as T;
  if (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toWellFormed(entry)])
    ) as T;
  }
  return value;
}

// Caido's backend rejects lone UTF-16 surrogates left by truncated tool output.
const wellFormedPromptMiddleware: LanguageModelV3Middleware = {
  specificationVersion: "v3",
  transformParams: ({ params }) =>
    Promise.resolve({ ...params, prompt: toWellFormed(params.prompt) }),
};

type ExtendedAILanguageModelSettings = Omit<
  AILanguageModelSettings,
  "reasoning" | "capabilities"
> & {
  // Omitted rather than disabled: models that always reason reject `disabled`.
  reasoning?: {
    kind: "effort";
    effort: ReasoningEffort;
    output: "include";
  };
};

type ExtendedAIProvider = (
  modelId: string,
  settings?: ExtendedAILanguageModelSettings
) => LanguageModelV3;

export function getReasoningEfforts(model: Model): ReasoningEffort[] {
  if (!model.capabilities.reasoning) return [];
  const declared = model.reasoningEfforts;
  return declared !== undefined && declared.length > 0
    ? MODEL_REASONING_EFFORTS.filter((effort) => declared.includes(effort))
    : [...MODEL_REASONING_EFFORTS];
}

export function resolveReasoningEffort(model: Model, requested: ReasoningEffort) {
  const efforts = getReasoningEfforts(model);
  if (efforts.includes(requested)) return requested;
  const requestedIndex = MODEL_REASONING_EFFORTS.indexOf(requested);
  return (
    efforts
      .toReversed()
      .find((effort) => MODEL_REASONING_EFFORTS.indexOf(effort) < requestedIndex) ?? efforts[0]
  );
}

export function createModel(
  sdk: FrontendSDK,
  selectedModel: Model,
  options: CreateModelOptions = {}
) {
  const model =
    listCaidoModels(sdk).find(
      (candidate) =>
        candidate.provider === selectedModel.provider && candidate.id === selectedModel.id
    ) ?? selectedModel;
  const {
    reasoning = true,
    reasoningEffort = "medium",
    openRouterPrioritizeFastProviders = false,
  } = options;

  const isReasoningModel = reasoning && model.capabilities.reasoning;

  const provider = sdk.ai.createProvider() as ExtendedAIProvider;

  const modelId =
    model.provider === ModelProvider.OpenRouter && openRouterPrioritizeFastProviders
      ? `${model.id}:nitro`
      : model.id;

  const modelKey = createModelKey(model.provider, modelId);
  const effectiveReasoningEffort = resolveReasoningEffort(model, reasoningEffort);

  const caidoModel = provider(modelKey, {
    reasoning:
      isReasoningModel && effectiveReasoningEffort !== undefined
        ? {
            kind: "effort",
            effort: effectiveReasoningEffort,
            output: "include",
          }
        : undefined,
  });

  return wrapLanguageModel({ model: caidoModel, middleware: wellFormedPromptMiddleware });
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
