import {
  type LanguageModel,
  type ModelMessage,
  type StepResult,
  streamText,
  type ToolSet,
} from "ai";
import type { ShiftMessage } from "shared";

const CHARS_PER_TOKEN = 4;
const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;
const COMPACTION_TRIGGER_TOKENS = 200_000;
const SUMMARY_MAX_OUTPUT_TOKENS = 32_000;

export function getCompactionThreshold(contextWindow: number | undefined): number {
  const window = contextWindow ?? DEFAULT_CONTEXT_WINDOW_TOKENS;
  return Math.min(COMPACTION_TRIGGER_TOKENS, Math.floor(window * 0.8));
}

const COMPACTION_PROMPT = `
Your context window is almost full, so this conversation is being compacted. Write a summary that replaces everything above. You will continue the work from this summary alone, so anything you leave out is lost.

Include, where relevant:
- The user's requests and instructions, quoting the latest request verbatim, and whether each is done.
- Target details: hosts, endpoints, parameters, auth mechanism, roles and accounts, IDs, tokens or cookies in use, and where they are stored (environment and variable names, learning indexes).
- Confirmed findings with the exact request and response evidence that proves them.
- What was tested and ruled out, with the payloads, so it is not repeated.
- Observed application behavior: validation rules, error messages, WAF blocks, tech stack hints.
- Open leads and the next concrete steps.

Be specific: keep exact values, payloads, paths, and IDs rather than paraphrasing them. Write the summary only, with no preamble, and call no tools.
`.trim();

export function buildSummaryMessage(summary: string): ModelMessage {
  return {
    role: "user",
    content: `<conversation_summary>\nThe earlier part of this conversation was compacted into this summary:\n\n${summary}\n</conversation_summary>\n\nContinue the work from where the summary leaves off.`,
  };
}

export function applyCompactionMarker(messages: ShiftMessage[]): {
  summary: string | undefined;
  messages: ShiftMessage[];
} {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    for (let j = message.parts.length - 1; j >= 0; j--) {
      const part = message.parts[j]!;
      if (part.type !== "data-compaction") continue;

      const rest = message.parts.slice(j + 1);
      const tail = rest.length > 0 ? [{ ...message, parts: rest }] : [];
      return { summary: part.data.summary, messages: [...tail, ...messages.slice(i + 1)] };
    }
  }
  return { summary: undefined, messages };
}

function estimateTokens(value: unknown): number {
  const text = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

type CreateCompactorOptions<TOOLS extends ToolSet> = {
  model: LanguageModel;
  system: string;
  tools: TOOLS;
  contextWindow: number | undefined;
  abortSignal?: AbortSignal;
  onCompact: (summary: string) => void;
};

export function createCompactor<TOOLS extends ToolSet>(options: CreateCompactorOptions<TOOLS>) {
  const { model, system, tools, abortSignal, onCompact } = options;
  const threshold = getCompactionThreshold(options.contextWindow);
  let compacted: { summary: string; fromIndex: number } | undefined;

  const view = (messages: ModelMessage[]) =>
    compacted === undefined
      ? messages
      : [buildSummaryMessage(compacted.summary), ...messages.slice(compacted.fromIndex)];

  return async ({
    messages,
    steps,
  }: {
    messages: ModelMessage[];
    steps: StepResult<TOOLS>[];
  }): Promise<{ messages: ModelMessage[] } | undefined> => {
    const current = view(messages);
    const lastUsage = steps.at(-1)?.usage;
    const usedTokens =
      lastUsage?.inputTokens !== undefined
        ? lastUsage.inputTokens + (lastUsage.outputTokens ?? 0)
        : estimateTokens(system) + estimateTokens(current);

    if (usedTokens < threshold) {
      return compacted === undefined ? undefined : { messages: current };
    }

    // Same system and tools as the agent so the summary request reuses its prompt cache.
    // Streamed because Caido caps non-streaming completions at 5 minutes.
    const result = streamText({
      model,
      system,
      tools,
      toolChoice: "none",
      messages: [...current, { role: "user", content: COMPACTION_PROMPT }],
      maxOutputTokens: SUMMARY_MAX_OUTPUT_TOKENS,
      maxRetries: 3,
      abortSignal,
    });
    const summary = (await result.text).trim();
    if (summary === "") {
      return compacted === undefined ? undefined : { messages: current };
    }

    compacted = { summary, fromIndex: messages.length };
    onCompact(summary);
    return { messages: [buildSummaryMessage(summary)] };
  };
}
