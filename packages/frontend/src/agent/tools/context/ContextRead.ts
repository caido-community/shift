import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { ENVIRONMENT_NAME_CHARS, type ContextPromptSnapshot } from "@/agent/context.prompt";
import type { ConvertWorkflowSnapshot } from "@/agent/context.prompt.types";
import { truncateContextValue } from "@/agent/context.truncation";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const inputSchema = z.object({});

const PREVIEW_CHARS = 400;
const NAME_CHARS = 160;
const DESCRIPTION_CHARS = 500;
const LIST_LIMIT = 50;

const todoSchema = z.object({
  id: z.number(),
  content: z.string(),
  status: z.enum(["pending", "in_progress", "completed"]),
});

const requestSchema = z.object({
  loaded: z.boolean(),
  length: z.number(),
  method: z.string().optional(),
  target: z.string().optional(),
  protocol: z.string().optional(),
  headerCount: z.number().optional(),
  bodyLength: z.number().optional(),
  retrievalHint: z.string().optional(),
});

const learningSchema = z.object({
  index: z.number(),
  preview: z.string(),
  length: z.number(),
});

const environmentInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const environmentVariableSchema = z.object({
  name: z.string(),
  kind: z.enum(["PLAIN", "SECRET"]),
  valueLength: z.number(),
  preview: z.string().optional(),
});

const workflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

const binarySchema = z.object({
  path: z.string(),
  instructions: z.string().optional(),
});

const valueSchema = z.object({
  todos: z.array(todoSchema),
  request: requestSchema,
  replayEntries: z.object({
    activeEntryId: z.string().optional(),
    recentEntryIds: z.array(z.string()),
  }),
  learnings: z.object({
    count: z.number(),
    entries: z.array(learningSchema),
    retrievalHint: z.string().optional(),
  }),
  environments: z.object({
    selectedId: z.string().optional(),
    selectedName: z.string().optional(),
    all: z.array(environmentInfoSchema),
    totalCount: z.number(),
    variables: z.array(environmentVariableSchema),
    retrievalHint: z.string().optional(),
  }),
  allowedConvertWorkflows: z.object({
    restricted: z.boolean(),
    workflows: z.array(workflowSchema),
    totalCount: z.number(),
    retrievalHint: z.string(),
  }),
  allowedBinaries: z.object({
    binaries: z.array(binarySchema),
    totalCount: z.number(),
    retrievalHint: z.string().optional(),
  }),
  retrievalHints: z.array(z.string()),
});

type ContextReadInput = z.infer<typeof inputSchema>;
export type ContextReadValue = z.infer<typeof valueSchema>;
type ContextReadOutput = ToolResultType<ContextReadValue>;
type RequestSummary = z.infer<typeof requestSchema>;

type BuildContextReadOptions = {
  allowedConvertWorkflows?: ConvertWorkflowSnapshot[];
  workflowsRestricted?: boolean;
};

export const display = {
  streaming: () => [{ text: "Reading " }, { text: "session context", muted: true }],
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Read " }, { text: "session context", muted: true }];
    }
    return [
      { text: "Read context " },
      { text: `${output.request.length} request chars`, muted: true },
    ];
  },
  error: () => "Failed to read context",
} satisfies ToolDisplay<ContextReadInput, ContextReadValue>;

function truncateField(value: string, maxLength = PREVIEW_CHARS): string {
  return truncateContextValue(value, maxLength);
}

function firstItems<T>(items: T[]): T[] {
  return items.slice(0, LIST_LIMIT);
}

export function summarizeCurrentRequest(rawRequest: string | undefined): RequestSummary {
  if (rawRequest === undefined || rawRequest === "") {
    return {
      loaded: false,
      length: 0,
    };
  }

  const normalized = rawRequest.replace(/\r?\n/g, "\r\n");
  const headerEnd = normalized.indexOf("\r\n\r\n");
  const head = headerEnd === -1 ? normalized : normalized.slice(0, headerEnd);
  const bodyLength = headerEnd === -1 ? 0 : normalized.length - headerEnd - 4;
  const lines = head.split("\r\n");
  const requestLine = lines[0]?.trim() ?? "";
  const [method, target, protocol] = requestLine.split(/\s+/);
  const headerCount = lines.slice(1).filter((line) => line.trim() !== "").length;

  const summary: RequestSummary = {
    loaded: true,
    length: rawRequest.length,
    headerCount,
    bodyLength,
    retrievalHint:
      "Use RequestRangeRead with offset and limit to inspect exact current request text.",
  };

  if (isPresent(method) && method !== "") {
    summary.method = truncateField(method, NAME_CHARS);
  }
  if (isPresent(target) && target !== "") {
    summary.target = truncateField(target, PREVIEW_CHARS);
  }
  if (isPresent(protocol) && protocol !== "") {
    summary.protocol = truncateField(protocol, NAME_CHARS);
  }

  return summary;
}

function buildLearningDigest(snapshot: ContextPromptSnapshot): ContextReadValue["learnings"] {
  const entries = firstItems(snapshot.learnings ?? []).map((learning) => ({
    index: learning.index,
    preview: truncateField(learning.preview),
    length: learning.length,
  }));

  return {
    count: snapshot.learnings?.length ?? 0,
    entries,
    retrievalHint:
      entries.length > 0
        ? "Use LearningRead with the learning index to inspect an exact full entry."
        : undefined,
  };
}

function buildEnvironmentDigest(snapshot: ContextPromptSnapshot): ContextReadValue["environments"] {
  const environments = snapshot.environmentsContext;
  const all = firstItems(environments?.all ?? []).map((environment) => ({
    id: environment.id,
    name: truncateField(environment.name, ENVIRONMENT_NAME_CHARS),
  }));

  const variables = firstItems(snapshot.environmentVariables ?? []).map((variable) => ({
    name: truncateField(variable.name, NAME_CHARS),
    kind: variable.kind,
    valueLength: variable.valueLength,
    preview:
      variable.preview !== undefined ? truncateField(variable.preview, PREVIEW_CHARS) : undefined,
  }));

  return {
    selectedId: environments?.selectedId,
    selectedName:
      environments?.selectedName !== undefined
        ? truncateField(environments.selectedName, ENVIRONMENT_NAME_CHARS)
        : undefined,
    all,
    totalCount: environments?.all.length ?? 0,
    variables,
    retrievalHint:
      variables.length > 0 || environments?.selectedId !== undefined
        ? "Use EnvironmentRead to inspect full current environment variables."
        : undefined,
  };
}

function buildWorkflowDigest(
  snapshot: ContextPromptSnapshot,
  options: BuildContextReadOptions
): ContextReadValue["allowedConvertWorkflows"] {
  const workflows = options.allowedConvertWorkflows ?? snapshot.allowedConvertWorkflows ?? [];
  const restricted = options.workflowsRestricted ?? snapshot.allowedConvertWorkflows !== undefined;

  return {
    restricted,
    workflows: firstItems(workflows).map((workflow) => ({
      id: workflow.id,
      name: truncateField(workflow.name, NAME_CHARS),
      description: truncateField(workflow.description, DESCRIPTION_CHARS),
    })),
    totalCount: workflows.length,
    retrievalHint: "Use WorkflowConvertList to refresh available convert workflows.",
  };
}

function buildBinaryDigest(snapshot: ContextPromptSnapshot): ContextReadValue["allowedBinaries"] {
  const binaries = snapshot.allowedBinaries ?? [];

  return {
    binaries: firstItems(binaries).map((binary) => ({
      path: truncateField(binary.path, PREVIEW_CHARS),
      instructions:
        binary.instructions !== undefined
          ? truncateField(binary.instructions, DESCRIPTION_CHARS)
          : undefined,
    })),
    totalCount: binaries.length,
    retrievalHint:
      binaries.length > 0
        ? "Use BinaryExecRun only with one of these allowed binary paths."
        : undefined,
  };
}

export function buildContextReadValue(
  snapshot: ContextPromptSnapshot,
  options: BuildContextReadOptions = {}
): ContextReadValue {
  const request = summarizeCurrentRequest(snapshot.httpRequest);
  const learnings = buildLearningDigest(snapshot);
  const environments = buildEnvironmentDigest(snapshot);

  return {
    todos: snapshot.todos ?? [],
    request,
    replayEntries: {
      activeEntryId: snapshot.entriesContext?.activeEntryId,
      recentEntryIds: snapshot.entriesContext?.recentEntryIds ?? [],
    },
    learnings,
    environments,
    allowedConvertWorkflows: buildWorkflowDigest(snapshot, options),
    allowedBinaries: buildBinaryDigest(snapshot),
    retrievalHints: [
      "Use ContextRead for compact live state; live runtime context is not injected into chat messages.",
      "Use RequestRangeRead before precise raw request edits or sends that depend on exact current text.",
      "Use ResponseSearch and ResponseRangeRead with response IDs returned by RequestSend for response details.",
      "Use LearningRead, EnvironmentRead, and ReadSkill when previews are insufficient.",
      "Use PayloadBlobRangeRead for blob-backed historical tool outputs.",
    ],
  };
}

function getAllowedConvertWorkflows(context: AgentContext): ConvertWorkflowSnapshot[] {
  const allowedIds = context.allowedWorkflowIds;
  const allowedSet = allowedIds !== undefined ? new Set(allowedIds) : undefined;

  return context.sdk.workflows
    .getWorkflows()
    .filter((workflow) => workflow.kind === "Convert")
    .filter((workflow) => allowedSet === undefined || allowedSet.has(workflow.id))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
    }));
}

export const ContextRead = tool({
  description:
    "Read a compact, live snapshot of the current Shift/Caido agent runtime state. Use this to discover current todos, request metadata, replay entries, selected environment metadata, learning previews, allowed convert workflows, and allowed binaries. This tool intentionally does not return the full raw HTTP request or secret environment values; use the narrower read tools named in the result when exact data is needed.",
  inputSchema,
  outputSchema: ToolResult.schema(valueSchema),
  execute: async (_input, { experimental_context }): Promise<ContextReadOutput> => {
    const context = experimental_context as AgentContext;
    await Promise.allSettled([context.fetchEnvironmentInfo(), context.fetchEntriesInfo()]);

    return ToolResult.ok({
      message: "Read compact live runtime context.",
      ...buildContextReadValue(context.toContextSnapshot(), {
        allowedConvertWorkflows: getAllowedConvertWorkflows(context),
        workflowsRestricted: context.allowedWorkflowIds !== undefined,
      }),
    });
  },
});
