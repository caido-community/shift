import { type ModelGroup } from "@/agents/types";
import {
  AnthropicIcon,
  DeepseekIcon,
  GoogleIcon,
  OpenAIIcon,
  QwenIcon,
  XAIIcon,
} from "@/components/agent/ChatInput/ModelSelector/icons";

export const models: ModelGroup[] = [
  {
    label: "Anthropic",
    icon: AnthropicIcon,
    items: [
      {
        name: "Claude 4.5 Sonnet",
        id: "anthropic/claude-sonnet-4.5",
        isRecommended: true,
        isReasoningModel: true,
      },
      {
        name: "Claude 4 Sonnet",
        id: "anthropic/claude-sonnet-4",
        isReasoningModel: true,
        isRecommended: true,
      },
      {
        name: "Claude 3.7 Sonnet",
        isRecommended: true,
        id: "anthropic/claude-3.7-sonnet",
        isReasoningModel: true,
      },
      {
        name: "Claude 3.5 Sonnet",
        isRecommended: true,
        id: "anthropic/claude-3.5-sonnet",
      },
    ],
  },
  {
    label: "OpenAI",
    icon: OpenAIIcon,
    items: [
      {
        name: "GPT 5",
        id: "openai/gpt-5",
        isReasoningModel: true,
      },
      {
        name: "GPT 5 Mini",
        id: "openai/gpt-5-mini",
        isReasoningModel: true,
      },
      {
        name: "GPT 5 Nano",
        id: "openai/gpt-5-nano",
        isReasoningModel: true,
      },
      {
        name: "GPT 4.1",
        id: "openai/gpt-4.1",
        isReasoningModel: true,
      },
    ],
  },
  {
    label: "Google",
    icon: GoogleIcon,
    items: [
      {
        name: "Gemini 2.5 Pro",
        isReasoningModel: true,
        id: "google/gemini-2.5-pro",
      },
      {
        name: "Gemini 2.5 Flash",
        id: "google/gemini-2.5-flash",
        isReasoningModel: true,
      },
      {
        name: "Gemini 2.5 Flash Lite",
        id: "google/gemini-2.5-flash-lite",
        isRecommended: true,
      },
    ],
  },
  {
    label: "xAI",
    icon: XAIIcon,
    items: [
      {
        name: "Grok 4 Fast",
        id: "x-ai/grok-4-fast",
        isReasoningModel: true,
        isRecommended: true,
      },
      {
        name: "Grok Code Fast",
        id: "x-ai/grok-code-fast-1",
      },
    ],
  },
  {
    label: "DeepSeek",
    icon: DeepseekIcon,
    items: [
      {
        name: "DeepSeek R1",
        isReasoningModel: true,
        isRecommended: true,
        id: "deepseek/deepseek-r1-0528",
      },
      {
        name: "DeepSeek V3",
        id: "deepseek/deepseek-chat-v3-0324",
      },
    ],
  },
  {
    label: "Qwen",
    icon: QwenIcon,
    items: [
      {
        name: "Qwen3 Coder",
        id: "qwen/qwen3-coder",
      },
    ],
  },
];
