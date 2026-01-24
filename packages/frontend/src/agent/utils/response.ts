import { Result } from "shared";

import type { AgentContext } from "@/agent/context";

const MAX_CONTEXT_LENGTH = 50;
const MAX_OCCURRENCES = 20;
const MAX_READ_LENGTH = 5000;

type Occurrence = {
  index: number;
  startIndex: number;
  endIndex: number;
  context: string;
};

type SearchResult = {
  totalOccurrences: number;
  returnedOccurrences: number;
  occurrences: Occurrence[];
};

type ReadResult = {
  content: string;
  startIndex: number;
  endIndex: number;
  truncated: boolean;
};

type ResponseData = {
  content: string;
  length: number;
};

const extractContext = (content: string, matchStart: number, matchEnd: number): string => {
  const contextStart = Math.max(0, matchStart - MAX_CONTEXT_LENGTH);
  const contextEnd = Math.min(content.length, matchEnd + MAX_CONTEXT_LENGTH);

  let context = content.slice(contextStart, contextEnd);

  if (contextStart > 0) {
    context = "..." + context;
  }
  if (contextEnd < content.length) {
    context = context + "...";
  }

  return context;
};

export const searchInContent = (
  content: string,
  pattern: string,
  caseSensitive: boolean
): SearchResult => {
  const searchContent = caseSensitive ? content : content.toLowerCase();
  const searchPattern = caseSensitive ? pattern : pattern.toLowerCase();

  const occurrences: Occurrence[] = [];
  let searchIndex = 0;
  let totalOccurrences = 0;

  while (searchIndex < searchContent.length) {
    const foundIndex = searchContent.indexOf(searchPattern, searchIndex);
    if (foundIndex === -1) break;

    const matchEnd = foundIndex + pattern.length;

    if (occurrences.length < MAX_OCCURRENCES) {
      occurrences.push({
        index: totalOccurrences,
        startIndex: foundIndex,
        endIndex: matchEnd,
        context: extractContext(content, foundIndex, matchEnd),
      });
    }

    totalOccurrences++;
    searchIndex = foundIndex + 1;
  }

  return {
    totalOccurrences,
    returnedOccurrences: occurrences.length,
    occurrences,
  };
};

export const readContentRange = (
  content: string,
  startIndex: number,
  endIndex: number
): ReadResult => {
  const contentLength = content.length;
  const clampedEnd = Math.min(endIndex, contentLength);
  const actualEndIndex = Math.min(clampedEnd, startIndex + MAX_READ_LENGTH);
  const truncated = actualEndIndex < clampedEnd;

  return {
    content: content.slice(startIndex, actualEndIndex),
    startIndex,
    endIndex: actualEndIndex,
    truncated,
  };
};

export const fetchResponse = async (
  context: AgentContext,
  responseId: string
): Promise<Result<ResponseData>> => {
  const result = await context.sdk.graphql.response({
    id: responseId,
  });

  if (result.response === undefined || result.response === null) {
    return Result.err(`No response with ID: ${responseId}`);
  }

  return Result.ok({
    content: result.response.raw,
    length: result.response.raw.length,
  });
};
