import type { Model, ShiftMessage } from "shared";

import {
  applyCompactionMarker,
  estimateSerializableCharacters,
  estimateTokensFromCharacters,
  getCompactionThreshold,
  getContextWindow,
} from "@/agent/compaction";

export function estimateMessagesCharacters(messages: ShiftMessage[]): number {
  return messages.reduce((total, message) => {
    const parts = message.parts.filter((part) => part.type !== "data-request-diff");
    return total + message.role.length + estimateSerializableCharacters(parts);
  }, 0);
}

export type ContextSegment = {
  label: string;
  tokens: number;
  kind: "system" | "tools" | "skills" | "turn" | "latest";
};

function groupTurns(messages: ShiftMessage[]): ShiftMessage[][] {
  const turns: ShiftMessage[][] = [];
  for (const message of messages) {
    const current = turns[turns.length - 1];
    if (message.role === "user" || current === undefined) {
      turns.push([message]);
    } else {
      current.push(message);
    }
  }
  return turns;
}

export function getEstimatedContextUsage(args: {
  model: Model | undefined;
  systemPrompt: string;
  skillsPrompt: string;
  toolsCharacters: number;
  messages: ShiftMessage[];
}) {
  const { model, systemPrompt, skillsPrompt, toolsCharacters } = args;
  const { summary, messages } = applyCompactionMarker(args.messages);
  const turns = groupTurns(messages);

  const fixedSegments: ContextSegment[] = [
    {
      label: "System prompt",
      tokens: estimateTokensFromCharacters(systemPrompt.length - skillsPrompt.length),
      kind: "system",
    },
    { label: "Tools", tokens: estimateTokensFromCharacters(toolsCharacters), kind: "tools" },
    { label: "Skills", tokens: estimateTokensFromCharacters(skillsPrompt.length), kind: "skills" },
    { label: "Summary", tokens: estimateTokensFromCharacters(summary?.length ?? 0), kind: "turn" },
  ];
  const segments = [
    ...fixedSegments,
    ...turns.map((turn, index): ContextSegment => {
      const isLatest = index === turns.length - 1;
      return {
        label: isLatest ? "Latest turn" : `Turn ${index + 1}`,
        tokens: estimateTokensFromCharacters(estimateMessagesCharacters(turn)),
        kind: isLatest ? "latest" : "turn",
      };
    }),
  ].filter((segment) => segment.tokens > 0);

  const contextWindowTokens = getContextWindow(model?.contextWindow);
  const availableTokens = getCompactionThreshold(model?.contextWindow);
  const estimatedTokens = segments.reduce((total, segment) => total + segment.tokens, 0);
  const measuredIndex = messages.findLastIndex(
    (message) => message.metadata?.contextTokens !== undefined
  );
  const measuredTokens = messages[measuredIndex]?.metadata?.contextTokens;
  const usedTokens =
    measuredTokens === undefined
      ? estimatedTokens
      : measuredTokens +
        estimateTokensFromCharacters(estimateMessagesCharacters(messages.slice(measuredIndex + 1)));
  const scale = usedTokens / estimatedTokens;

  return {
    segments: segments.map((segment) => ({
      ...segment,
      tokens: Math.round(segment.tokens * scale),
    })),
    usedTokens,
    availableTokens,
    contextWindowTokens,
    percentage: (usedTokens / availableTokens) * 100,
  };
}

export function getCacheHitRate(messages: ShiftMessage[]): number | undefined {
  let inputTokens = 0;
  let cacheReadTokens = 0;
  for (const { metadata } of messages) {
    const usage = metadata?.usage;
    if (usage?.inputTokens === undefined || usage.cacheReadTokens === undefined) continue;
    inputTokens += usage.inputTokens;
    cacheReadTokens += usage.cacheReadTokens;
  }
  return inputTokens === 0 ? undefined : (cacheReadTokens / inputTokens) * 100;
}

export function formatTokens(tokens: number): string {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}
