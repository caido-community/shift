import { type Model, type ModelReasoningEffort } from "shared";

import type { FrontendSDK } from "../types";

type UpstreamProvider = {
  id: string;
  kind: string;
  auth: "API_KEY" | "OAUTH" | "AWS" | "NONE";
};

type UpstreamModel = {
  id: string;
  providerId: string;
  displayName: string;
  support: { reasoning: "SUPPORTED" | "UNSUPPORTED" | "UNKNOWN" };
  reasoningEfforts: ModelReasoningEffort[];
  contextWindow?: number;
};

type ModelRegistry = {
  getUpstreamModels?: () => UpstreamModel[];
  onUpstreamModelsChange?: (callback: () => void) => void;
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

export function listCaidoModels(sdk: FrontendSDK): Model[] {
  return (sdk.ai as ModelRegistry).getUpstreamModels?.().map(toModel) ?? [];
}

export function onCaidoModelsChange(sdk: FrontendSDK, callback: () => void) {
  (sdk.ai as ModelRegistry).onUpstreamModelsChange?.(callback);
}
