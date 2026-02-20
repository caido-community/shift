import { Buffer } from "buffer";
import { spawn } from "child_process";
import { accessSync, constants as fsConstants, statSync } from "fs";
import * as path from "path";

import {
  type CancelAgentBinaryExecutionInput,
  CancelAgentBinaryExecutionInputSchema,
  type ExecuteAgentBinaryInput,
  ExecuteAgentBinaryInputSchema,
  type ExecuteAgentBinaryOutput,
  Result,
  type Result as ResultType,
} from "shared";

import { getCustomAgentsStore } from "../stores";
import type { BackendSDK } from "../types";

import {
  appendStreamChunk,
  createStreamCollector,
  validateArgs,
  validateStdin,
} from "./agent-binaries.utils";

const EXEC_TIMEOUT_MS = 30_000;
const runningExecutions = new Map<string, ReturnType<typeof spawn>>();

function emitBinaryLogChunk(
  sdk: BackendSDK,
  executionId: string,
  stream: "stdout" | "stderr",
  chunk: Buffer | undefined
): void {
  if (chunk === undefined || chunk.length === 0) {
    return;
  }

  sdk.api.send("agent-binary-log-chunk", {
    executionId,
    stream,
    delta: chunk.toString("utf8"),
  });
}

async function runBinary(
  sdk: BackendSDK,
  executionId: string,
  binaryPath: string,
  args: string[],
  stdin: string | undefined
): Promise<ResultType<ExecuteAgentBinaryOutput>> {
  if (runningExecutions.has(executionId)) {
    return Result.err("Execution already running");
  }

  const stdout = createStreamCollector();
  const stderr = createStreamCollector();

  const child = spawn(binaryPath, args);
  runningExecutions.set(executionId, child);

  if (child.stdout !== null) {
    child.stdout.on("data", (data) => {
      const chunk = appendStreamChunk(stdout, data);
      emitBinaryLogChunk(sdk, executionId, "stdout", chunk);
    });
  }

  if (child.stderr !== null) {
    child.stderr.on("data", (data) => {
      const chunk = appendStreamChunk(stderr, data);
      emitBinaryLogChunk(sdk, executionId, "stderr", chunk);
    });
  }

  let timedOut = false;
  const startTime = Date.now();

  const outcome = await new Promise<{
    code: number | undefined;
    signal: string | undefined;
    error: string | undefined;
  }>((resolve) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, EXEC_TIMEOUT_MS);

    const finish = (payload: {
      code: number | undefined;
      signal: string | undefined;
      error: string | undefined;
    }) => {
      if (settled) {
        return;
      }
      settled = true;
      runningExecutions.delete(executionId);
      clearTimeout(timeoutId);
      resolve(payload);
    };

    if (child.stdin !== null) {
      child.stdin.once("error", (error) => {
        if ("code" in error && error.code === "EPIPE") {
          return;
        }

        console.error(`Unexpected error on child stdin: ${error.message}`);
        finish({
          code: undefined,
          signal: undefined,
          error: `Failed to write to stdin: ${error.message}`,
        });
        child.kill("SIGKILL");
      });

      if (stdin !== undefined) {
        child.stdin.write(stdin);
      }
      child.stdin.end();
    }

    child.once("error", (error) => {
      finish({
        code: undefined,
        signal: undefined,
        error: error.message,
      });
    });

    child.once("close", (code, signal) => {
      finish({
        code: code === null ? undefined : code,
        signal: signal === null ? undefined : String(signal),
        error: undefined,
      });
    });
  });

  if (outcome.error !== undefined) {
    return Result.err(`Failed to execute binary: ${outcome.error}`);
  }

  const durationMs = Date.now() - startTime;

  return Result.ok({
    exitCode: outcome.code,
    signal: outcome.signal,
    timedOut,
    durationMs,
    stdout: Buffer.concat(stdout.chunks).toString("utf8"),
    stderr: Buffer.concat(stderr.chunks).toString("utf8"),
    stdoutTruncated: stdout.truncated,
    stderrTruncated: stderr.truncated,
    stdoutBytes: stdout.bytes,
    stderrBytes: stderr.bytes,
  });
}

export async function executeAgentBinary(
  sdk: BackendSDK,
  input: ExecuteAgentBinaryInput
): Promise<ResultType<ExecuteAgentBinaryOutput>> {
  try {
    const parsed = ExecuteAgentBinaryInputSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    const { executionId, agentId, binaryPath, args, stdin } = parsed.data;

    const store = getCustomAgentsStore();
    const agent = store.getAgentDefinitions().find((candidate) => candidate.id === agentId);
    if (agent === undefined) {
      return Result.err("Agent not found");
    }

    const allowedPaths = agent.allowedBinaries?.map((binary) => binary.path);
    if (allowedPaths === undefined || allowedPaths.length === 0) {
      return Result.err("No binaries are allowed for this agent");
    }

    if (!allowedPaths.includes(binaryPath)) {
      return Result.err("Binary path is not allowed for this agent");
    }

    if (!path.isAbsolute(binaryPath)) {
      return Result.err("Binary path must be absolute");
    }

    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(binaryPath);
    } catch {
      return Result.err("Binary path does not exist");
    }

    if (!stats.isFile()) {
      return Result.err("Binary path must point to a file");
    }

    try {
      accessSync(binaryPath, fsConstants.X_OK);
    } catch {
      return Result.err("Binary is not executable");
    }

    const argsValidation = validateArgs(args);
    if (argsValidation.kind === "Error") {
      return argsValidation;
    }

    const stdinValidation = validateStdin(stdin);
    if (stdinValidation.kind === "Error") {
      return stdinValidation;
    }

    return await runBinary(sdk, executionId, binaryPath, args, stdin);
  } catch (error) {
    return Result.err(error instanceof Error ? error.message : String(error));
  }
}

export function cancelAgentBinaryExecution(
  _sdk: BackendSDK,
  input: CancelAgentBinaryExecutionInput
): ResultType<void> {
  try {
    const parsed = CancelAgentBinaryExecutionInputSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err(parsed.error.message);
    }

    const child = runningExecutions.get(parsed.data.executionId);
    if (child === undefined) {
      return Result.ok(undefined);
    }

    child.kill("SIGKILL");
    return Result.ok(undefined);
  } catch (error) {
    return Result.err(error instanceof Error ? error.message : String(error));
  }
}
