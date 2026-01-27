import type { MessageMetadata, PartState } from "shared";
import { Result } from "shared";
import { computed, type ComputedRef, type MaybeRefOrGetter, toValue } from "vue";

import { type FrontendError } from "@/agent/types";

export type ToolState = "streaming" | "pending" | "success" | "error";

export type UseToolOptions = {
  partState: MaybeRefOrGetter<PartState>;
  messageMetadata: MaybeRefOrGetter<MessageMetadata | undefined>;
  output: MaybeRefOrGetter<unknown>;
};

export type UseTool = {
  toolState: ComputedRef<ToolState>;
  isLoading: ComputedRef<boolean>;
  isError: ComputedRef<boolean>;
  isFinished: ComputedRef<boolean>;
  errorMessage: ComputedRef<string>;
  extractedOutput: ComputedRef<unknown>;
};

function extractOutput(output: unknown): unknown {
  if (Result.isResult(output) && output.kind === "Ok") {
    return output.value;
  }
  return output;
}

export function useTool(options: UseToolOptions, defaultErrorMessage: string): UseTool {
  const toolState = computed<ToolState>(() => {
    const metadata = toValue(options.messageMetadata);
    const state = toValue(options.partState);
    const out = toValue(options.output);

    const isMessageAborted = metadata?.state === "aborted" || metadata?.state === "error";

    switch (state) {
      case "output-available":
        return Result.isResult(out) && out.kind === "Error" ? "error" : "success";
      case "output-error":
        return "error";
      case "input-streaming":
        return isMessageAborted ? "error" : "streaming";
      case "input-available":
        return isMessageAborted ? "error" : "pending";
      default:
        return "error";
    }
  });

  const isLoading = computed(() => {
    const state = toolState.value;
    return state === "streaming" || state === "pending";
  });

  const isError = computed(() => toolState.value === "error");

  const isFinished = computed(() => {
    const state = toValue(options.messageMetadata)?.state;
    return state === "done" || state === "aborted" || state === "error";
  });

  const errorMessage = computed(() => {
    const metadata = toValue(options.messageMetadata);
    if (metadata?.state === "aborted") {
      return "Aborted";
    }

    const out = toValue(options.output);
    if (Result.isResult(out) && out.kind === "Error") {
      return (out.error as FrontendError).message;
    }
    return defaultErrorMessage;
  });

  const extractedOutput = computed(() => extractOutput(toValue(options.output)));

  return {
    toolState,
    isLoading,
    isError,
    isFinished,
    errorMessage,
    extractedOutput,
  };
}
