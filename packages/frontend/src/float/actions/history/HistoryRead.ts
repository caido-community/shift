import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { isPresent } from "@/utils";

const ORDER_DIRECTION = ["ASC", "DESC"] as const;
const DEFAULT_LIMIT = 40;
const MAX_TARGET_LENGTH = 140;
const MAX_TOON_LENGTH = 5000;

const inputSchema = z.object({
  filter: z.string().optional().describe("Optional HTTPQL filter applied to history entries."),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Maximum entries to return (default: 40, max: 100)."),
  offset: z.number().int().nonnegative().optional().describe("Pagination offset (default: 0)."),
  ordering: z.enum(ORDER_DIRECTION).optional().describe("Sort direction by ID (default: DESC)."),
  scopeId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe("Optional scope ID to constrain the query."),
});

const valueSchema = z.object({
  format: z.literal("toon"),
  toon: z.string(),
  totalReturned: z.number(),
  offset: z.number(),
  limit: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
  nextOffset: z.number().optional(),
  truncated: z.boolean(),
  truncatedCharacters: z.number().optional(),
});

type HistoryRow = {
  rowId: string;
  requestId: string;
  metadataId: string;
  method: string;
  target: string;
  statusCode: number | undefined;
  roundtripTimeMs: number | undefined;
};

type TruncatedToon = {
  value: string;
  truncated: boolean;
  truncatedCharacters: number | undefined;
};

const truncateMiddle = (
  value: string,
  maxLength: number,
  marker: string
): { value: string; omittedCharacters: number } => {
  if (value.length <= maxLength) {
    return { value, omittedCharacters: 0 };
  }

  if (maxLength <= marker.length + 2) {
    return {
      value: value.slice(0, maxLength),
      omittedCharacters: value.length - maxLength,
    };
  }

  const remaining = maxLength - marker.length;
  const headLength = Math.ceil(remaining / 2);
  const tailLength = Math.max(0, remaining - headLength);

  return {
    value: `${value.slice(0, headLength)}${marker}${value.slice(value.length - tailLength)}`,
    omittedCharacters: value.length - headLength - tailLength,
  };
};

const truncateTarget = (value: string): string => {
  if (value.length <= MAX_TARGET_LENGTH) {
    return value;
  }

  return truncateMiddle(value, MAX_TARGET_LENGTH, "...[truncated]...").value;
};

const encodeToonCell = (value: string | number | undefined): string => {
  if (!isPresent(value)) {
    return "-";
  }

  const normalized = String(value).replace(/\r?\n/g, "\\n");
  const needsQuotes =
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.startsWith(" ") ||
    normalized.endsWith(" ");

  if (!needsQuotes) {
    return normalized;
  }

  const escaped = normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
};

const toToon = (rows: HistoryRow[]): string => {
  const lines = [
    "entries[" +
      rows.length +
      "]{rowId,requestId,metadataId,method,target,statusCode,roundtripTimeMs}:",
  ];

  for (const row of rows) {
    lines.push(
      "  " +
        [
          encodeToonCell(row.rowId),
          encodeToonCell(row.requestId),
          encodeToonCell(row.metadataId),
          encodeToonCell(row.method),
          encodeToonCell(row.target),
          encodeToonCell(row.statusCode),
          encodeToonCell(row.roundtripTimeMs),
        ].join(",")
    );
  }

  return lines.join("\n");
};

const truncateToon = (
  toon: string,
  maxLength: number,
  nextOffset: number | undefined
): TruncatedToon => {
  if (toon.length <= maxLength) {
    return {
      value: toon,
      truncated: false,
      truncatedCharacters: undefined,
    };
  }

  const continuationHint =
    nextOffset !== undefined ? ` Continue with nextOffset=${nextOffset}.` : "";
  let marker = `\n...[truncated. ${toon.length - maxLength} characters omitted.${continuationHint}]...\n`;
  let candidate = truncateMiddle(toon, maxLength, marker);

  marker = `\n...[truncated. ${candidate.omittedCharacters} characters omitted.${continuationHint}]...\n`;
  candidate = truncateMiddle(toon, maxLength, marker);

  return {
    value: candidate.value,
    truncated: true,
    truncatedCharacters: candidate.omittedCharacters,
  };
};

export const historyReadTool = tool({
  description:
    "Read HTTP history entries with offset pagination and return a compact TOON table that includes row IDs, request IDs, metadata IDs, and pagination signals.",
  inputSchema,
  outputSchema: ActionResult.schemaWithValue(valueSchema),
  execute: async (
    { filter, limit = DEFAULT_LIMIT, offset = 0, ordering = "DESC", scopeId },
    { experimental_context }
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    const normalizedScopeId = scopeId?.trim();
    const effectiveScopeId =
      normalizedScopeId !== undefined && normalizedScopeId !== ""
        ? normalizedScopeId
        : (sdk.httpHistory.getScopeId() ?? undefined);

    try {
      const result = await sdk.graphql.interceptEntriesByOffset({
        filter,
        limit,
        offset,
        scopeId: effectiveScopeId,
        order: {
          by: "ID",
          ordering,
        },
      });

      const connection = result.interceptEntriesByOffset;
      if (!isPresent(connection)) {
        return ActionResult.err(
          "Failed to read HTTP history",
          "No history entries connection returned"
        );
      }

      const edges = connection.edges ?? [];
      const rows: HistoryRow[] = [];

      for (const edge of edges) {
        const node = edge.node;
        const pathWithQuery =
          isPresent(node.request.query) && node.request.query !== ""
            ? `${node.request.path}?${node.request.query}`
            : node.request.path;
        const defaultPort = node.request.isTls ? 443 : 80;
        const targetHost =
          node.request.port === defaultPort
            ? node.request.host
            : `${node.request.host}:${node.request.port}`;
        const response = isPresent(node.request.response) ? node.request.response : undefined;

        rows.push({
          rowId: node.id,
          requestId: node.request.id,
          metadataId: node.request.metadata.id,
          method: node.request.method,
          target: truncateTarget(`${targetHost}${pathWithQuery}`),
          statusCode: response?.statusCode,
          roundtripTimeMs: response?.roundtripTime,
        });
      }

      const totalReturned = rows.length;
      const hasNextPage = connection.pageInfo.hasNextPage;
      const hasPreviousPage = connection.pageInfo.hasPreviousPage;
      const nextOffset = hasNextPage ? offset + totalReturned : undefined;
      const toon = toToon(rows);
      const truncatedToon = truncateToon(toon, MAX_TOON_LENGTH, nextOffset);

      return ActionResult.okWithValue({
        message:
          totalReturned > 0
            ? `Read ${totalReturned} history entries.`
            : "No history entries found for this query",
        format: "toon",
        toon: truncatedToon.value,
        totalReturned,
        offset,
        limit,
        hasNextPage,
        hasPreviousPage,
        nextOffset,
        truncated: truncatedToon.truncated,
        truncatedCharacters: truncatedToon.truncatedCharacters,
      });
    } catch (error) {
      return ActionResult.err(
        "Failed to read HTTP history",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
