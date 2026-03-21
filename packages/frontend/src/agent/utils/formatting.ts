import type { ReasoningTime } from "shared";

import { isPresent } from "../../utils/optional";

const BLOB_PLACEHOLDER_PATTERN = /§§§Blob§([^§]+)§§§/g;

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

export function formatToolDisplayText(text: string): string {
  return text.replace(
    BLOB_PLACEHOLDER_PATTERN,
    (_match, blobId: string) => `[payload blob: ${blobId}]`
  );
}
