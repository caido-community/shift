import type { ReasoningTime } from "shared";

import { isPresent } from "../../utils/optional";

const BLOB_PLACEHOLDER_PATTERN = /§§§Blob§([^§]+)§§§/g;

function coerceToolDisplayText(text: unknown): string {
  if (typeof text === "string") {
    return text;
  }
  if (typeof text === "number" || typeof text === "boolean" || typeof text === "bigint") {
    return String(text);
  }
  return "";
}

export function formatReasoningTime(
  times: ReasoningTime[] | undefined,
  index: number
): string | undefined {
  if (!isPresent(times)) return undefined;

  const timing = times[index];
  if (!isPresent(timing?.start) || !isPresent(timing?.end)) return undefined;

  const duration = timing.end - timing.start;
  const seconds = Math.round(duration / 1000);
  return seconds === 0 ? `${duration}ms` : `${seconds}s`;
}

export function formatToolDisplayText(text: unknown): string {
  return coerceToolDisplayText(text).replace(
    BLOB_PLACEHOLDER_PATTERN,
    (_match, blobId: string) => `[payload blob: ${blobId}]`
  );
}
