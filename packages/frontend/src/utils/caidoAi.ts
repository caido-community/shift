import { type Model, type ModelReasoningEffort } from "shared";

import type { FrontendSDK } from "../types";

// Not typed by `@caido/sdk-frontend` yet.
type UpstreamProvider = {
  id: string;
  api: string;
  kind: string;
  auth: "API_KEY" | "OAUTH" | "AWS" | "NONE";
};

type UpstreamModelCapabilitySupport = "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN";

type UpstreamModel = {
  /** Model name without the provider prefix; may itself contain `/`. */
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  support: {
    toolCalling: UpstreamModelCapabilitySupport;
    reasoning: UpstreamModelCapabilitySupport;
    structuredOutput: UpstreamModelCapabilitySupport;
    temperature: UpstreamModelCapabilitySupport;
  };
  reasoningEfforts: ModelReasoningEffort[];
  contextWindow?: number;
  outputTokenLimit?: number;
  source: "CATALOG" | "CUSTOM" | "CUSTOMIZED";
};

type ListenerHandle = { stop: () => void };

type AiSdkWithRegistry = FrontendSDK["ai"] & {
  getUpstreamModels: () => UpstreamModel[];
  onUpstreamModelsChange: (callback: (models: UpstreamModel[]) => void) => ListenerHandle;
};

type UpstreamProviderStatus = {
  id: string;
  isConfigured: boolean;
  label: string;
  icon: string;
};

const PROVIDER_PRESENTATION: Record<string, { label: string; icon: string }> = {
  ANTHROPIC: { label: "Anthropic", icon: "anthropic" },
  BEDROCK: { label: "Bedrock", icon: "amazon-bedrock" },
  CHATGPT: { label: "ChatGPT", icon: "openai" },
  GEMINI: { label: "Gemini", icon: "google" },
  OPENAI: { label: "OpenAI", icon: "openai" },
  OPENROUTER: { label: "OpenRouter", icon: "openrouter" },
  XAI: { label: "xAI", icon: "xai" },
};

function getProviderPresentation(provider: UpstreamProvider) {
  if (provider.kind === "XAI" && provider.auth === "OAUTH") {
    return { label: "Grok", icon: "xai" };
  }
  return PROVIDER_PRESENTATION[provider.kind] ?? { label: provider.id, icon: "custom" };
}

export function listUpstreamProviders(sdk: FrontendSDK): UpstreamProviderStatus[] {
  const providers = sdk.ai.getUpstreamProviders() as unknown as UpstreamProvider[];

  const statuses = providers.map((provider) => ({
    id: provider.id,
    isConfigured: true,
    ...getProviderPresentation(provider),
  }));
  const labelCounts = new Map<string, number>();
  for (const provider of statuses) {
    labelCounts.set(provider.label, (labelCounts.get(provider.label) ?? 0) + 1);
  }
  return statuses.map((provider) => ({
    ...provider,
    label:
      (labelCounts.get(provider.label) ?? 0) > 1
        ? `${provider.label} (${provider.id})`
        : provider.label,
  }));
}

const toModel = (model: UpstreamModel): Model => ({
  id: model.id,
  name: model.displayName,
  provider: model.providerId,
  contextWindow: model.contextWindow,
  capabilities: {
    // UNKNOWN stays permissive: Caido narrows requests server-side
    reasoning: model.support.reasoning !== "UNSUPPORTED",
  },
  reasoningEfforts: model.reasoningEfforts,
});

// Caido added the model registry in 0.59; older versions have no models to offer.
export function listCaidoModels(sdk: FrontendSDK): Model[] {
  return (sdk.ai as Partial<AiSdkWithRegistry>).getUpstreamModels?.().map(toModel) ?? [];
}

export function onCaidoModelsChange(sdk: FrontendSDK, callback: () => void) {
  (sdk.ai as Partial<AiSdkWithRegistry>).onUpstreamModelsChange?.(callback);
}
