import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";
import { isPresent } from "@/utils";

const READ_PART = ["request", "response", "both"] as const;
const DEFAULT_MAX_REQUEST_CHARS = 2500;
const DEFAULT_MAX_RESPONSE_CHARS = 2500;

const inputSchema = z
  .object({
    requestIds: z
      .array(z.string().min(1))
      .max(10)
      .optional()
      .describe("Request IDs to inspect. Supports batch reads (max 10 IDs per call)."),
    rowIds: z
      .array(z.string().min(1))
      .max(10)
      .optional()
      .describe(
        "History row IDs to inspect. These can be used directly for row.id HTTPQL workflows and are resolved to request IDs internally."
      ),
    part: z
      .enum(READ_PART)
      .optional()
      .describe('Which raw content to fetch: "request", "response", or "both" (default: both).'),
    maxRequestChars: z
      .number()
      .int()
      .positive()
      .max(10000)
      .optional()
      .describe("Maximum characters returned per request raw value (default: 2500)."),
    maxResponseChars: z
      .number()
      .int()
      .positive()
      .max(10000)
      .optional()
      .describe("Maximum characters returned per response raw value (default: 2500)."),
  })
  .superRefine((value, context) => {
    const requestIdsCount = value.requestIds?.length ?? 0;
    const rowIdsCount = value.rowIds?.length ?? 0;
    if (requestIdsCount === 0 && rowIdsCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one ID in requestIds or rowIds.",
        path: ["requestIds"],
      });
    }
  });

const entrySchema = z.object({
  rowId: z.string().optional(),
  requestId: z.string(),
  responseId: z.string().optional(),
  statusCode: z.number().optional(),
  responseAvailable: z.boolean(),
  requestRaw: z.string().optional(),
  responseRaw: z.string().optional(),
  requestTruncated: z.boolean().optional(),
  requestTruncatedCharacters: z.number().optional(),
  responseTruncated: z.boolean().optional(),
  responseTruncatedCharacters: z.number().optional(),
});

const valueSchema = z.object({
  entries: z.array(entrySchema),
  totalRequested: z.number(),
  totalReturned: z.number(),
  missingRowIds: z.array(z.string()),
  failedRowIds: z.array(z.string()),
  missingRequestIds: z.array(z.string()),
  failedRequestIds: z.array(z.string()),
});

type HistoryReadPart = (typeof READ_PART)[number];
type TruncatedValue = {
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

const truncateRaw = (
  value: string,
  maxLength: number,
  label: "request" | "response"
): TruncatedValue => {
  if (value.length <= maxLength) {
    return {
      value,
      truncated: false,
      truncatedCharacters: undefined,
    };
  }

  let marker = `\n...[truncated ${label}. ${value.length - maxLength} characters omitted]...\n`;
  let candidate = truncateMiddle(value, maxLength, marker);

  marker = `\n...[truncated ${label}. ${candidate.omittedCharacters} characters omitted]...\n`;
  candidate = truncateMiddle(value, maxLength, marker);

  return {
    value: candidate.value,
    truncated: true,
    truncatedCharacters: candidate.omittedCharacters,
  };
};

const shouldReadRequest = (part: HistoryReadPart): boolean => part === "request" || part === "both";
const shouldReadResponse = (part: HistoryReadPart): boolean =>
  part === "response" || part === "both";

export const historyRequestResponseReadTool = tool({
  description:
    "Read raw request/response content for specific request IDs or history row IDs (batch supported) with explicit truncation metadata for deep HTTP history inspection.",
  inputSchema,
  outputSchema: ActionResult.schemaWithValue(valueSchema),
  execute: async (
    {
      requestIds,
      rowIds,
      part = "both",
      maxRequestChars = DEFAULT_MAX_REQUEST_CHARS,
      maxResponseChars = DEFAULT_MAX_RESPONSE_CHARS,
    },
    { experimental_context }
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    const uniqueRequestIds = [...new Set(requestIds ?? [])];
    const uniqueRowIds = [...new Set(rowIds ?? [])];
    const entries: Array<z.infer<typeof entrySchema>> = [];
    const requestToRowId = new Map<string, string>();
    const missingRowIds: string[] = [];
    const failedRowIds: string[] = [];
    const missingRequestIds: string[] = [];
    const failedRequestIds: string[] = [];

    for (const rowId of uniqueRowIds) {
      try {
        const interceptEntryResult = await sdk.graphql.interceptEntry({ id: rowId });
        const interceptEntry = interceptEntryResult.interceptEntry;
        if (!isPresent(interceptEntry) || !isPresent(interceptEntry.request)) {
          missingRowIds.push(rowId);
          continue;
        }

        requestToRowId.set(interceptEntry.request.id, rowId);
      } catch {
        failedRowIds.push(rowId);
      }
    }

    for (const requestId of uniqueRequestIds) {
      if (!requestToRowId.has(requestId)) {
        requestToRowId.set(requestId, "");
      }
    }

    for (const [requestId, rowId] of requestToRowId.entries()) {
      try {
        const requestResult = await sdk.graphql.request({ id: requestId });
        const requestNode = requestResult.request;
        if (!isPresent(requestNode)) {
          missingRequestIds.push(requestId);
          continue;
        }

        const entry: z.infer<typeof entrySchema> = {
          rowId: rowId === "" ? undefined : rowId,
          requestId,
          responseAvailable: isPresent(requestNode.response),
        };

        if (shouldReadRequest(part)) {
          const truncatedRequest = truncateRaw(requestNode.raw, maxRequestChars, "request");
          entry.requestRaw = truncatedRequest.value;
          entry.requestTruncated = truncatedRequest.truncated;
          entry.requestTruncatedCharacters = truncatedRequest.truncatedCharacters;
        }

        if (shouldReadResponse(part) && isPresent(requestNode.response)) {
          entry.responseId = requestNode.response.id;
          entry.statusCode = requestNode.response.statusCode;

          const responseResult = await sdk.graphql.response({ id: requestNode.response.id });
          const responseNode = responseResult.response;

          if (isPresent(responseNode)) {
            const truncatedResponse = truncateRaw(responseNode.raw, maxResponseChars, "response");
            entry.responseRaw = truncatedResponse.value;
            entry.responseTruncated = truncatedResponse.truncated;
            entry.responseTruncatedCharacters = truncatedResponse.truncatedCharacters;
            entry.statusCode = responseNode.statusCode;
          }
        }

        entries.push(entry);
      } catch {
        failedRequestIds.push(requestId);
      }
    }

    const totalReturned = entries.length;

    return ActionResult.okWithValue({
      message:
        totalReturned > 0
          ? `Read ${totalReturned} request/response records.`
          : "No request/response records were read",
      entries,
      totalRequested: requestToRowId.size,
      totalReturned,
      missingRowIds,
      failedRowIds,
      missingRequestIds,
      failedRequestIds,
    });
  },
});
