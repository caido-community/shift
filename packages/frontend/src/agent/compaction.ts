import {
  asSchema,
  type LanguageModel,
  type ModelMessage,
  type StepResult,
  streamText,
  type Tool,
  type ToolSet,
} from "ai";
import type { ShiftMessage } from "shared";

const CHARS_PER_TOKEN = 4;
const DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000;
// Models advertise up to 1M+, but quality and pricing degrade well before that (Codex caps GPT-5 at 272k)
const RECOMMENDED_CONTEXT_WINDOW_TOKENS = 272_000;
const SUMMARY_MAX_OUTPUT_TOKENS = 32_000;

export function getContextWindow(contextWindow: number | undefined): number {
  return Math.min(
    contextWindow ?? DEFAULT_CONTEXT_WINDOW_TOKENS,
    RECOMMENDED_CONTEXT_WINDOW_TOKENS
  );
}

function getSummaryMaxOutputTokens(contextWindow: number | undefined): number {
  return Math.min(SUMMARY_MAX_OUTPUT_TOKENS, Math.floor(getContextWindow(contextWindow) * 0.25));
}

export function getCompactionThreshold(contextWindow: number | undefined): number {
  const windowTokens = getContextWindow(contextWindow);
  return Math.min(
    Math.floor(windowTokens * 0.9),
    windowTokens - getSummaryMaxOutputTokens(contextWindow)
  );
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

export function estimateSerializableCharacters(value: unknown): number {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === "string") {
    return value.length;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value).length;
  }

  try {
    return JSON.stringify(value)?.length ?? 0;
  } catch {
    return "[unserializable]".length;
  }
}

export function estimateTokensFromCharacters(characters: number): number {
  return Math.ceil(Math.max(0, characters) / CHARS_PER_TOKEN);
}

function estimateTokens(value: unknown): number {
  return estimateTokensFromCharacters(estimateSerializableCharacters(value));
}

export function estimateToolsCharacters(tools: Record<string, Tool>): number {
  return Object.entries(tools).reduce((total, [name, tool]) => {
    return (
      total +
      name.length +
      (tool.description?.length ?? 0) +
      estimateSerializableCharacters(asSchema(tool.inputSchema).jsonSchema)
    );
  }, 0);
}

type SummarizeOptions = {
  model: LanguageModel;
  system: string;
  tools: ToolSet;
  messages: ModelMessage[];
  maxOutputTokens: number;
  abortSignal: AbortSignal | undefined;
};

async function summarize(options: SummarizeOptions): Promise<string> {
  const result = streamText({
    ...options,
    toolChoice: "none",
    messages: [...options.messages, { role: "user", content: COMPACTION_PROMPT }],
    maxRetries: 3,
  });

  let summary = "";
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") {
      summary += part.text;
    } else if (part.type === "error") {
      const reason = part.error instanceof Error ? part.error.message : String(part.error);
      throw new Error(`Context compaction failed: ${reason}`, { cause: part.error });
    }
  }
  options.abortSignal?.throwIfAborted();

  if (summary.trim() === "") {
    throw new Error("Context compaction failed: the summary was empty");
  }
  return summary.trim();
}

type CreateCompactorOptions<TOOLS extends ToolSet> = {
  model: LanguageModel;
  system: string;
  tools: TOOLS;
  contextWindow: number | undefined;
  abortSignal?: AbortSignal;
  initialTokens?: number;
  onCompact: (summary: string) => void;
  onCompacting?: (active: boolean) => void;
  onMeasure?: (tokens: number) => void;
};

export function createCompactor<TOOLS extends ToolSet>(options: CreateCompactorOptions<TOOLS>) {
  const { model, system, tools, abortSignal, onCompact, onCompacting, onMeasure } = options;
  const threshold = getCompactionThreshold(options.contextWindow);
  const fixedTokens =
    estimateTokens(system) + estimateTokensFromCharacters(estimateToolsCharacters(tools));
  let compacted: { summary: string; fromIndex: number } | undefined;
  let sentMessages: ModelMessage[] = [];
  let contextTokens = options.initialTokens;

  const measure = (tokens: number) => {
    contextTokens = tokens;
    onMeasure?.(tokens);
  };

  const prepareStep = async ({ messages }: { messages: ModelMessage[] }) => {
    sentMessages =
      compacted === undefined
        ? messages
        : [buildSummaryMessage(compacted.summary), ...messages.slice(compacted.fromIndex)];
    if ((contextTokens ?? fixedTokens + estimateTokens(sentMessages)) < threshold) {
      return compacted === undefined ? undefined : { messages: sentMessages };
    }

    onCompacting?.(true);
    let summary: string;
    try {
      summary = await summarize({
        model,
        system,
        tools,
        messages: sentMessages,
        maxOutputTokens: getSummaryMaxOutputTokens(options.contextWindow),
        abortSignal,
      });
    } finally {
      onCompacting?.(false);
    }

    compacted = { summary, fromIndex: messages.length };
    sentMessages = [buildSummaryMessage(summary)];
    onCompact(summary);
    measure(fixedTokens + estimateTokens(sentMessages));
    return { messages: sentMessages };
  };

  const onStepFinish = ({ usage, content }: StepResult<TOOLS>) => {
    const inputTokens = usage.inputTokens ?? 0;
    if (inputTokens > 0) {
      const toolOutputs = content.filter(
        (part) => part.type === "tool-result" || part.type === "tool-error"
      );
      measure(inputTokens + (usage.outputTokens ?? 0) + estimateTokens(toolOutputs));
    } else {
      measure(fixedTokens + estimateTokens(sentMessages) + estimateTokens(content));
    }
  };

  return { prepareStep, onStepFinish };
}
