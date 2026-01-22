import type { ReasoningTime } from "shared";

import { isPresent } from "../../utils/optional";

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
