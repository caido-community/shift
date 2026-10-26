import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ContextPromptSnapshot, ENVIRONMENT_NAME_CHARS } from "@/agent/context.prompt";
import type { ConvertWorkflowSnapshot } from "@/agent/context.prompt.types";
import { truncateContextValue } from "@/agent/context.truncation";
import {
  getAllowedConvertWorkflows,
  workflowSchema,
} from "@/agent/tools/workflows/WorkflowConvertList";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const inputSchema = z.object({});

const PREVIEW_CHARS = 400;
const NAME_CHARS = 160;
const DESCRIPTION_CHARS = 500;
const LIST_LIMIT = 50;

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

const binarySchema = z.object({
  path: z.string(),
  instructions: z.string().optional(),
});

const valueSchema = z.object({
  request: requestSchema,
  replayEntries: z.object({
    activeEntryId: z.string().optional(),
    recentEntryIds: z.array(z.string()),
  }),
  target: z
    .object({
      host: z.string(),
      port: z.number(),
      isTLS: z.boolean(),
      SNI: z.string().optional(),
    })
    .optional(),
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
type ContextReadValue = z.infer<typeof valueSchema>;
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
    summary.method = truncateContextValue(method, NAME_CHARS);
  }
  if (isPresent(target) && target !== "") {
    summary.target = truncateContextValue(target, PREVIEW_CHARS);
  }
  if (isPresent(protocol) && protocol !== "") {
    summary.protocol = truncateContextValue(protocol, NAME_CHARS);
  }

  return summary;
}

function buildLearningDigest(snapshot: ContextPromptSnapshot): ContextReadValue["learnings"] {
  const entries = (snapshot.learnings ?? []).slice(0, LIST_LIMIT).map((learning) => ({
    index: learning.index,
    preview: truncateContextValue(learning.preview, PREVIEW_CHARS),
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
  const all = (environments?.all ?? []).slice(0, LIST_LIMIT).map((environment) => ({
    id: environment.id,
    name: truncateContextValue(environment.name, ENVIRONMENT_NAME_CHARS),
  }));

  const variables = (snapshot.environmentVariables ?? []).slice(0, LIST_LIMIT).map((variable) => ({
    name: truncateContextValue(variable.name, NAME_CHARS),
    kind: variable.kind,
    valueLength: variable.valueLength,
    preview:
      variable.preview !== undefined
        ? truncateContextValue(variable.preview, PREVIEW_CHARS)
        : undefined,
  }));

  return {
    selectedId: environments?.selectedId,
    selectedName:
      environments?.selectedName !== undefined
        ? truncateContextValue(environments.selectedName, ENVIRONMENT_NAME_CHARS)
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
  options: BuildContextReadOptions
): ContextReadValue["allowedConvertWorkflows"] {
  const workflows = options.allowedConvertWorkflows ?? [];

  return {
    restricted: options.workflowsRestricted ?? false,
    workflows: workflows.slice(0, LIST_LIMIT).map((workflow) => ({
      id: workflow.id,
      name: truncateContextValue(workflow.name, NAME_CHARS),
      description: truncateContextValue(workflow.description, DESCRIPTION_CHARS),
    })),
    totalCount: workflows.length,
    retrievalHint: "Use WorkflowConvertList to refresh available convert workflows.",
  };
}

function buildBinaryDigest(snapshot: ContextPromptSnapshot): ContextReadValue["allowedBinaries"] {
  const binaries = snapshot.allowedBinaries ?? [];

  return {
    binaries: binaries.slice(0, LIST_LIMIT).map((binary) => ({
      path: truncateContextValue(binary.path, PREVIEW_CHARS),
      instructions:
        binary.instructions !== undefined
          ? truncateContextValue(binary.instructions, DESCRIPTION_CHARS)
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
    request,
    replayEntries: {
      activeEntryId: snapshot.entriesContext?.activeEntryId,
      recentEntryIds: snapshot.entriesContext?.recentEntryIds ?? [],
    },
    target: snapshot.entriesContext?.connection,
    learnings,
    environments,
    allowedConvertWorkflows: buildWorkflowDigest(options),
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

export const ContextRead = tool({
  description:
    "Read a compact, live snapshot of the current Shift/Caido agent runtime state. Use this to discover current request metadata, replay entries, selected environment metadata, learning previews, allowed convert workflows, and allowed binaries. This tool intentionally does not return the full raw HTTP request or secret environment values; use the narrower read tools named in the result when exact data is needed.",
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
