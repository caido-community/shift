import { type AgentBinaryLogChunkEvent } from "shared";
import { shallowReactive } from "vue";

import { type FrontendSDK } from "@/types";

type StreamedBinaryOutput = {
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
};

const streamedOutputs = shallowReactive(new Map<string, StreamedBinaryOutput>());
const textEncoder = new TextEncoder();
let isInitialized = false;

// Late or foreign chunks are dropped so finished executions don't leave entries behind.
function handleChunkEvent(event: AgentBinaryLogChunkEvent): void {
  const current = streamedOutputs.get(event.executionId);
  if (current === undefined || event.delta === "") {
    return;
  }

  const bytes = textEncoder.encode(event.delta).length;
  streamedOutputs.set(
    event.executionId,
    event.stream === "stdout"
      ? {
          ...current,
          stdout: current.stdout + event.delta,
          stdoutBytes: current.stdoutBytes + bytes,
        }
      : {
          ...current,
          stderr: current.stderr + event.delta,
          stderrBytes: current.stderrBytes + bytes,
        }
  );
}

export function initializeBinaryExecutionStream(sdk: FrontendSDK): void {
  if (isInitialized) return;

  isInitialized = true;
  sdk.backend.onEvent("agent-binary-log-chunk", handleChunkEvent);
}

export function startStreamedBinaryOutput(executionId: string): void {
  streamedOutputs.set(executionId, { stdout: "", stderr: "", stdoutBytes: 0, stderrBytes: 0 });
}

export function getStreamedBinaryOutput(
  executionId: string | undefined
): StreamedBinaryOutput | undefined {
  return executionId === undefined ? undefined : streamedOutputs.get(executionId);
}

export function clearStreamedBinaryOutput(executionId: string): void {
  streamedOutputs.delete(executionId);
}
