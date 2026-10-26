import { type Model, type ModelReasoningEffort } from "shared";

import type { FrontendSDK } from "../types";

type UpstreamProvider = {
  id: string;
  api: string;
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
  outputTokenLimit?: number;
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

function findUpstreamProvider(sdk: FrontendSDK, providerId: string) {
  const providers = sdk.ai.getUpstreamProviders() as unknown as UpstreamProvider[];
  return providers.find((candidate) => candidate.id === providerId);
}

export function getProviderKind(sdk: FrontendSDK, providerId: string): string | undefined {
  return findUpstreamProvider(sdk, providerId)?.kind;
}

const DAYBREAK_MODELS = ["gpt-6-sol", "gpt-6-luna", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"];
const ULTRAFAST_MODELS = ["gpt-6.1-sol", "gpt-6-astra"];

export function isOpenAIProvider(sdk: FrontendSDK, providerId: string): boolean {
  const kind = getProviderKind(sdk, providerId);
  return kind === "OPENAI" || kind === "CHATGPT";
}

export function supportsDaybreak(sdk: FrontendSDK, model: Model): boolean {
  return isOpenAIProvider(sdk, model.provider) && DAYBREAK_MODELS.includes(model.id);
}

export function isDaybreakUnsupported(sdk: FrontendSDK, model: Model): boolean {
  return isOpenAIProvider(sdk, model.provider) && !DAYBREAK_MODELS.includes(model.id);
}

export function supportsUltrafast(sdk: FrontendSDK, model: Model): boolean {
  return getProviderKind(sdk, model.provider) === "OPENAI" && ULTRAFAST_MODELS.includes(model.id);
}

export function supportsFastMode(sdk: FrontendSDK, providerId: string): boolean {
  const provider = findUpstreamProvider(sdk, providerId);
  return (
    provider !== undefined &&
    (provider.api === "OPENAI_COMPLETION" ||
      provider.api === "OPENAI_RESPONSE" ||
      provider.api === "CHATGPT_RESPONSE")
  );
}

const toModel = (model: UpstreamModel): Model => ({
  id: model.id,
  name: model.displayName,
  provider: model.providerId,
  contextWindow: model.contextWindow,
  outputTokenLimit: model.outputTokenLimit,
  capabilities: {
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
