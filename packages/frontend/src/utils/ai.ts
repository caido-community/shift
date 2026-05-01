import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
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

import { useSettingsStore } from "@/stores/settings";

type ProviderStatus = {
  id: string;
  isConfigured: boolean;
};

function isBedrockConfigured(): boolean {
  const settingsStore = useSettingsStore();
  const creds = settingsStore.bedrockCredentials;
  return (
    creds !== undefined &&
    creds.accessKeyId !== "" &&
    creds.secretAccessKey !== "" &&
    creds.region !== ""
  );
}

export function getProviderStatuses(sdk: FrontendSDK): ProviderStatus[] {
  const caidoStatuses = sdk.ai.getUpstreamProviders().map((provider) => ({
    id: provider.id,
    isConfigured: provider.status === "Ready",
  }));
  return [...caidoStatuses, { id: ModelProvider.Bedrock, isConfigured: isBedrockConfigured() }];
}

export function isProviderConfigured(sdk: FrontendSDK, provider: ModelProviderId): boolean {
  if (provider === ModelProvider.Bedrock) {
    return isBedrockConfigured();
  }
  const statuses = sdk.ai.getUpstreamProviders();
  const status = statuses.find((s) => s.id === provider);
  return status?.status === "Ready";
}

export function isAnyProviderConfigured(sdk: FrontendSDK): boolean {
  const statuses = getProviderStatuses(sdk);
  return statuses.some((s) => s.isConfigured === true);
}

export class ProviderNotConfiguredError extends Error {
  constructor(provider: ModelProviderId) {
    const hint =
      provider === ModelProvider.Bedrock
        ? "Please add your AWS credentials in Shift settings."
        : "Please configure it in Caido AI settings.";
    super(`Provider "${provider}" is not configured. ${hint}`);
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

  if (model.provider === ModelProvider.Bedrock) {
    const settingsStore = useSettingsStore();
    const creds = settingsStore.bedrockCredentials;
    if (
      creds === undefined ||
      creds.accessKeyId === "" ||
      creds.secretAccessKey === "" ||
      creds.region === ""
    ) {
      throw new ProviderNotConfiguredError(model.provider);
    }
    const bedrock = createAmazonBedrock({
      region: creds.region,
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    });
    return bedrock(model.id) as unknown as LanguageModelV3;
  }

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
