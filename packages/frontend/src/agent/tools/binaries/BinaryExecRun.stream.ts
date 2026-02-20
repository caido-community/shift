import { type AgentBinaryLogChunkEvent } from "shared";
import { shallowRef } from "vue";

import { type FrontendSDK } from "@/types";

export type StreamedBinaryOutput = {
  stdout: string;
  stderr: string;
  stdoutBytes: number;
  stderrBytes: number;
};

const streamedBinaryOutputMap = shallowRef<Map<string, StreamedBinaryOutput>>(new Map());
const textEncoder = new TextEncoder();
let isInitialized = false;

function createEmptyOutput(): StreamedBinaryOutput {
  return {
    stdout: "",
    stderr: "",
    stdoutBytes: 0,
    stderrBytes: 0,
  };
}

function byteLength(value: string): number {
  return textEncoder.encode(value).length;
}

function updateStreamedOutput(
  executionId: string,
  updater: (current: StreamedBinaryOutput) => StreamedBinaryOutput
): void {
  const nextMap = new Map(streamedBinaryOutputMap.value);
  const current = nextMap.get(executionId) ?? createEmptyOutput();
  nextMap.set(executionId, updater(current));
  streamedBinaryOutputMap.value = nextMap;
}

function handleChunkEvent(event: AgentBinaryLogChunkEvent): void {
  if (event.delta === "") {
    return;
  }

  updateStreamedOutput(event.executionId, (current) => {
    if (event.stream === "stdout") {
      return {
        ...current,
        stdout: `${current.stdout}${event.delta}`,
        stdoutBytes: current.stdoutBytes + byteLength(event.delta),
      };
    }

    return {
      ...current,
      stderr: `${current.stderr}${event.delta}`,
      stderrBytes: current.stderrBytes + byteLength(event.delta),
    };
  });
}

export function initializeBinaryExecutionStream(sdk: FrontendSDK): void {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  sdk.backend.onEvent("agent-binary-log-chunk", handleChunkEvent);
}

export function getStreamedBinaryOutput(
  executionId: string | undefined
): StreamedBinaryOutput | undefined {
  if (executionId === undefined) {
    return undefined;
  }
  return streamedBinaryOutputMap.value.get(executionId);
}

export function clearStreamedBinaryOutput(executionId: string): void {
  if (!streamedBinaryOutputMap.value.has(executionId)) {
    return;
  }

  const nextMap = new Map(streamedBinaryOutputMap.value);
  nextMap.delete(executionId);
  streamedBinaryOutputMap.value = nextMap;
}
