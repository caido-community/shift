import type { AgentBinaryLogChunkEvent } from "shared";
import { describe, expect, it } from "vitest";

import {
  clearStreamedBinaryOutput,
  getStreamedBinaryOutput,
  initializeBinaryExecutionStream,
  startStreamedBinaryOutput,
} from "./BinaryExecRun.stream";

import type { FrontendSDK } from "@/types";

let emit: (event: AgentBinaryLogChunkEvent) => void = () => undefined;
initializeBinaryExecutionStream({
  backend: {
    onEvent: (_name: string, handler: typeof emit) => {
      emit = handler;
    },
  },
} as unknown as FrontendSDK);

const chunk = (
  executionId: string,
  stream: "stdout" | "stderr",
  delta: string
): AgentBinaryLogChunkEvent => ({ executionId, stream, delta });

describe("binary execution stream", () => {
  it("accumulates chunks only while an execution is running", () => {
    emit(chunk("exec-1", "stdout", "early"));
    expect(getStreamedBinaryOutput("exec-1")).toBeUndefined();

    startStreamedBinaryOutput("exec-1");
    emit(chunk("exec-1", "stdout", "hé"));
    emit(chunk("exec-1", "stderr", "oops"));
    expect(getStreamedBinaryOutput("exec-1")).toEqual({
      stdout: "hé",
      stderr: "oops",
      stdoutBytes: 3,
      stderrBytes: 4,
    });

    clearStreamedBinaryOutput("exec-1");
    emit(chunk("exec-1", "stdout", "late"));
    expect(getStreamedBinaryOutput("exec-1")).toBeUndefined();
  });
});
