import type { UIMessagePart, UITools } from "ai";
import type { RequestDiff, ShiftDataTypes, ShiftMessage } from "shared";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { formatReasoningTime } from "@/agent/utils/formatting";

type ShiftMessagePart = UIMessagePart<ShiftDataTypes, UITools>;

type ProcessedPart = {
  part: ShiftMessagePart;
  index: number;
};

const SKIPPED_PART_TYPES = ["step-start", "data-request-diff"];

function shouldSkipPart(partType: string): boolean {
  return SKIPPED_PART_TYPES.includes(partType);
}

export function useAssistantMessage(message: MaybeRefOrGetter<ShiftMessage>) {
  const processedParts = computed<ProcessedPart[]>(() => {
    const result: ProcessedPart[] = [];
    const parts = toValue(message).parts;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === undefined || shouldSkipPart(part.type)) {
        continue;
      }

      result.push({ part, index: i });
    }

    return result;
  });

  const metadata = computed(() => toValue(message).metadata);

  const requestDiffs = computed(() => {
    const diffs = new Map<string, RequestDiff>();
    for (const part of toValue(message).parts) {
      if (part.type === "data-request-diff") {
        diffs.set(part.data.toolCallId, part.data);
      }
    }
    return diffs;
  });

  function calculateReasoningTime(reasoningIndex: number): string | undefined {
    return formatReasoningTime(metadata.value?.reasoning_times, reasoningIndex);
  }

  function getReasoningIndex(currentIndex: number): number {
    let count = 0;
    for (let i = 0; i < currentIndex; i++) {
      const processed = processedParts.value[i];
      if (processed?.part.type === "reasoning") {
        count++;
      }
    }
    return count;
  }

  return {
    processedParts,
    metadata,
    requestDiffs,
    calculateReasoningTime,
    getReasoningIndex,
  };
}
