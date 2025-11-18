import { type ModelItem, Provider } from "@/agents/types/config";

const openRouterModels: ModelItem[] = [
  {
    name: "Sonnet 4.5",
    id: "openrouter/anthropic/claude-sonnet-4.5",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Sonnet 4",
    id: "openrouter/anthropic/claude-sonnet-4",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Sonnet 3.7",
    id: "openrouter/anthropic/claude-3.7-sonnet",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Sonnet 3.5",
    id: "openrouter/anthropic/claude-3.5-sonnet",
    provider: Provider.OpenRouter,
  },
  {
    name: "GPT-5.1",
    id: "openrouter/openai/gpt-5.1",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "GPT-5 mini",
    id: "openrouter/openai/gpt-5-mini",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "GPT-5 nano",
    id: "openrouter/openai/gpt-5-nano",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "GPT-5 pro",
    id: "openrouter/openai/gpt-5-pro",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "GPT-5",
    id: "openrouter/openai/gpt-5",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "GPT-4.1",
    id: "openrouter/openai/gpt-4.1",
    isReasoningModel: false,
    provider: Provider.OpenRouter,
  },
  {
    name: "Gemini 3 Pro",
    id: "openrouter/google/gemini-3-pro-preview",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Gemini 2.5 Pro",
    id: "openrouter/google/gemini-2.5-pro",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Gemini 2.5 Flash",
    id: "openrouter/google/gemini-2.5-flash",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Gemini 2.5 Flash Lite",
    id: "openrouter/google/gemini-2.5-flash-lite",
    provider: Provider.OpenRouter,
  },
  {
    name: "Grok 4 Fast",
    id: "openrouter/x-ai/grok-4-fast",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "Grok Code Fast",
    id: "openrouter/x-ai/grok-code-fast-1",
    provider: Provider.OpenRouter,
  },
  {
    name: "DeepSeek R1",
    id: "openrouter/deepseek/deepseek-r1-0528",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
  {
    name: "DeepSeek V3",
    id: "openrouter/deepseek/deepseek-chat-v3-0324",
    provider: Provider.OpenRouter,
  },
  {
    name: "Qwen3 Coder",
    id: "openrouter/qwen/qwen3-coder",
    provider: Provider.OpenRouter,
  },
  {
    name: "Kimi K2 Thinking",
    id: "openrouter/moonshotai/kimi-k2-thinking",
    isReasoningModel: true,
    provider: Provider.OpenRouter,
  },
];

const anthropicModels: ModelItem[] = [
  {
    name: "Sonnet 4.5",
    id: "anthropic/claude-sonnet-4-5-20250929",
    provider: Provider.Anthropic,
    isReasoningModel: true,
  },
  {
    name: "Haiku 4.5",
    id: "anthropic/claude-haiku-4-5-20251001",
    provider: Provider.Anthropic,
    isReasoningModel: true,
  },
  {
    name: "Opus 4.1",
    id: "anthropic/claude-opus-4-1-20250805",
    provider: Provider.Anthropic,
    isReasoningModel: true,
  },
  {
    name: "Opus 4",
    id: "anthropic/claude-opus-4-20250514",
    provider: Provider.Anthropic,
    isReasoningModel: true,
  },
  {
    name: "Sonnet 4",
    id: "anthropic/claude-sonnet-4-20250514",
    provider: Provider.Anthropic,
    isReasoningModel: true,
  },
  {
    name: "Sonnet 3.7",
    id: "anthropic/claude-3-7-sonnet-20250219",
    provider: Provider.Anthropic,
    isReasoningModel: true,
  },
  {
    name: "Haiku 3.5",
    id: "anthropic/claude-3-5-haiku-20241022",
    provider: Provider.Anthropic,
  },
];

const openAIModels: ModelItem[] = [
  {
    name: "GPT-4o",
    id: "openai/gpt-4o",
    provider: Provider.OpenAI,
  },
  {
    name: "GPT-4.1",
    id: "openai/gpt-4.1",
    provider: Provider.OpenAI,
    isReasoningModel: true,
  },
  {
    name: "GPT-5.1",
    id: "openai/gpt-5.1",
    provider: Provider.OpenAI,
    isReasoningModel: true,
  },
];

const googleModels: ModelItem[] = [
  {
    name: "Gemini 3 Pro",
    id: "google/gemini-3-pro-preview",
    provider: Provider.Google,
    isReasoningModel: true,
  },
  {
    name: "Gemini 2.5 Pro",
    id: "google/gemini-2.5-pro",
    provider: Provider.Google,
    isReasoningModel: true,
  },
  {
    name: "Gemini 2.5 Flash",
    id: "google/gemini-2.5-flash",
    provider: Provider.Google,
    isReasoningModel: true,
  },
];

export const defaultEnabledModels = new Set([
  "openrouter/anthropic/claude-sonnet-4.5",
  "openrouter/anthropic/claude-sonnet-4",
  "openrouter/anthropic/claude-3.7-sonnet",
  "openrouter/openai/gpt-5.1",
  "openrouter/openai/gpt-5-nano",
  "openrouter/openai/gpt-4.1",
  "openrouter/google/gemini-3-pro-preview",
  "openrouter/google/gemini-2.5-flash-lite",
  "openrouter/x-ai/grok-4-fast",
  "openrouter/deepseek/deepseek-r1-0528",
  "openrouter/moonshotai/kimi-k2-thinking",

  "anthropic/claude-sonnet-4-5-20250929",
  "anthropic/claude-sonnet-4-20250514",
  "anthropic/claude-3-7-sonnet-20250219",

  "openai/gpt-5.1",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-4.1",
  "openai/gpt-4o",

  "google/gemini-3-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
]);

export const defaultModels: ModelItem[] = [
  ...openRouterModels,
  ...anthropicModels,
  ...openAIModels,
  ...googleModels,
];
