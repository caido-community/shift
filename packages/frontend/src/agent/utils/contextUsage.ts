import type { Model, ShiftMessage } from "shared";

export const CHARS_PER_TOKEN = 4;
export const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;
export const CONTEXT_WINDOW_SAFETY_BUFFER_TOKENS = 20_000;

function getSafeContextWindowTokens(model: Pick<Model, "contextWindow"> | undefined): number {
  const contextWindow = model?.contextWindow ?? DEFAULT_CONTEXT_WINDOW_TOKENS;
  const safeContextWindow = contextWindow - CONTEXT_WINDOW_SAFETY_BUFFER_TOKENS;
  return Math.max(1, safeContextWindow);
}

function estimateSerializableCharacters(value: unknown): number {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === "string") {
    return value.length;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value).length;
  }

  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return String(value).length;
  }
}

export function estimateMessagesCharacters(messages: ShiftMessage[]): number {
  return messages.reduce((total, message) => {
    return total + message.role.length + estimateSerializableCharacters(message.parts);
  }, 0);
}

export function estimateTokensFromCharacters(characters: number): number {
  return Math.ceil(Math.max(0, characters) / CHARS_PER_TOKEN);
}

export function getEstimatedContextUsage(args: {
  model: Model | undefined;
  systemPrompt: string;
  messages: ShiftMessage[];
}): {
  usedTokens: number;
  availableTokens: number;
  percentage: number;
} {
  const { model, systemPrompt, messages } = args;
  const availableTokens = getSafeContextWindowTokens(model);
  const usedTokens = estimateTokensFromCharacters(
    systemPrompt.length + estimateMessagesCharacters(messages)
  );

  return {
    usedTokens,
    availableTokens,
    percentage: (usedTokens / availableTokens) * 100,
  };
}

export function formatContextUsageLabel(percentage: number): string {
  return `${Math.max(0, Math.round(percentage))}% context used`;
}
