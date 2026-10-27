import {
  type ExecuteAgentBinaryOutput,
  ExecuteAgentBinaryOutputSchema,
  type MessageMetadata,
  type PartState,
} from "shared";
import stripAnsi from "strip-ansi";
import { computed, type MaybeRefOrGetter, onBeforeUnmount, ref, toValue, watch } from "vue";

import { getToolMessages } from "../messages";
import { useTool } from "../useTool";

import { getStreamedBinaryOutput } from "@/agent/tools/binaries";
import { type MessageResult } from "@/agent/types";
import { useDetailToggle } from "@/components/agent/useDetailToggle";

export type BinaryStream = {
  name: "stdout" | "stderr";
  text: string;
  truncated: boolean;
  bytes: number;
};

export function useBinaryOutput(args: {
  executionId: MaybeRefOrGetter<string | undefined>;
  partState: MaybeRefOrGetter<PartState>;
  messageMetadata: MaybeRefOrGetter<MessageMetadata | undefined>;
  input: MaybeRefOrGetter<unknown>;
  output: MaybeRefOrGetter<unknown>;
  errorText: MaybeRefOrGetter<string | undefined>;
}) {
  const { toolState, extractedOutput, errorMessage } = useTool(
    {
      partState: args.partState,
      messageMetadata: args.messageMetadata,
      output: args.output,
    },
    () => toValue(args.errorText) ?? "Failed to execute binary"
  );

  const messages = computed(() => getToolMessages("BinaryExecRun"));

  const displayContext = computed(() => ({
    input: toValue(args.input),
    output: extractedOutput.value,
  }));

  const defaultParts: MessageResult = [{ text: "Running " }, { text: "binary", muted: true }];

  const streamingResult = computed(
    () => messages.value?.streaming(displayContext.value) ?? defaultParts
  );

  const successResult = computed(
    () =>
      messages.value?.success(displayContext.value) ?? [
        { text: "Executed " },
        { text: "binary", muted: true },
      ]
  );

  const parsedOutput = computed<ExecuteAgentBinaryOutput | undefined>(() => {
    const parsed = ExecuteAgentBinaryOutputSchema.safeParse(extractedOutput.value);
    return parsed.success ? parsed.data : undefined;
  });

  const streamedOutput = computed<ExecuteAgentBinaryOutput | undefined>(() => {
    const partState = toValue(args.partState);
    if (partState !== "input-streaming" && partState !== "input-available") {
      return undefined;
    }

    const streamed = getStreamedBinaryOutput(toValue(args.executionId));
    if (streamed === undefined) {
      return undefined;
    }

    return {
      exitCode: undefined,
      signal: undefined,
      timedOut: false,
      durationMs: 0,
      stdout: streamed.stdout,
      stderr: streamed.stderr,
      stdoutTruncated: false,
      stderrTruncated: false,
      stdoutBytes: streamed.stdoutBytes,
      stderrBytes: streamed.stderrBytes,
    };
  });

  const binaryOutput = computed<ExecuteAgentBinaryOutput | undefined>(
    () => parsedOutput.value ?? streamedOutput.value
  );

  const streams = computed<BinaryStream[]>(() => {
    const out = binaryOutput.value;
    if (out === undefined) return [];
    const result: BinaryStream[] = [];
    if (out.stdout.length > 0 || out.stdoutTruncated) {
      result.push({
        name: "stdout",
        text: stripAnsi(out.stdout),
        truncated: out.stdoutTruncated,
        bytes: out.stdoutBytes,
      });
    }
    if (out.stderr.length > 0 || out.stderrTruncated) {
      result.push({
        name: "stderr",
        text: stripAnsi(out.stderr),
        truncated: out.stderrTruncated,
        bytes: out.stderrBytes,
      });
    }
    return result;
  });

  const isRunning = computed(
    () => toolState.value === "streaming" || toolState.value === "pending"
  );
  const liveOutputDelayPassed = ref(false);
  let liveOutputDelayTimeout: ReturnType<typeof setTimeout> | undefined;

  const clearLiveOutputDelayTimeout = () => {
    if (liveOutputDelayTimeout === undefined) {
      return;
    }

    clearTimeout(liveOutputDelayTimeout);
    liveOutputDelayTimeout = undefined;
  };

  watch(
    isRunning,
    (running) => {
      clearLiveOutputDelayTimeout();

      if (!running) {
        liveOutputDelayPassed.value = false;
        return;
      }

      liveOutputDelayPassed.value = false;
      liveOutputDelayTimeout = setTimeout(() => {
        liveOutputDelayPassed.value = true;
        liveOutputDelayTimeout = undefined;
      }, 1_000);
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    clearLiveOutputDelayTimeout();
  });

  const showLiveOutput = computed(
    () => isRunning.value && liveOutputDelayPassed.value && streams.value.length > 0
  );

  const isExpandable = computed(
    () => toolState.value === "success" && binaryOutput.value !== undefined
  );

  const { isOpen: isExpanded, toggle } = useDetailToggle();

  return {
    toolState,
    errorMessage,
    streamingResult,
    successResult,
    streams,
    showLiveOutput,
    isExpandable,
    isExpanded,
    toggle,
  };
}
