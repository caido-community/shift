import type { UIMessagePart, UITools } from "ai";
import type { ShiftDataTypes, ShiftMessage } from "shared";
import { computed, type MaybeRefOrGetter, toValue } from "vue";

import { formatReasoningTime } from "@/agent/utils/formatting";
import { hasThinkTag, stripThinkTags } from "@/utils";

type ShiftMessagePart = UIMessagePart<ShiftDataTypes, UITools>;

type ProcessedPart = {
  part: ShiftMessagePart;
  index: number;
};

const SKIPPED_PART_TYPES = ["step-start"];

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

      // Strip inline <think> reasoning blocks this model emits into text parts.
      // Drop the part entirely if nothing is left (e.g. an empty <think></think>).
      if (part.type === "text" && hasThinkTag(part.text)) {
        const isStreaming = part.state === "streaming";
        const cleaned = stripThinkTags(part.text, { stripDangling: isStreaming });
        if (cleaned.length === 0) {
          continue;
        }
        result.push({ part: { ...part, text: cleaned }, index: i });
        continue;
      }

      result.push({ part, index: i });
    }

    return result;
  });

  const metadata = computed(() => toValue(message).metadata);

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
    calculateReasoningTime,
    getReasoningIndex,
  };
}
