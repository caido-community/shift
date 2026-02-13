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

const MAX_ARGS = 32;
const MAX_ARG_LENGTH = 2_048;
const MAX_TOTAL_ARG_BYTES = 16_384;
const MAX_STDIN_BYTES = 65_536;
const MAX_STDIO_BYTES = 65_536;
const EXEC_TIMEOUT_MS = 30_000;
const runningExecutions = new Map<string, ReturnType<typeof spawn>>();

type CollectedStream = {
  chunks: Buffer[];
  bytes: number;
  truncated: boolean;
};

function toBuffer(data: unknown): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (typeof data === "string") {
    return Buffer.from(data);
  }
  return Buffer.from(String(data));
}

function appendStreamChunk(stream: CollectedStream, data: unknown): Buffer | undefined {
  const chunk = toBuffer(data);
  const remaining = MAX_STDIO_BYTES - stream.bytes;

  if (remaining <= 0) {
    stream.truncated = true;
    return undefined;
  }

  if (chunk.length <= remaining) {
    stream.chunks.push(chunk);
    stream.bytes += chunk.length;
    return chunk;
  }

  const appendedChunk = chunk.subarray(0, remaining);
  stream.chunks.push(appendedChunk);
  stream.bytes += remaining;
  stream.truncated = true;
  return appendedChunk;
}

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

function createStreamCollector(): CollectedStream {
  return {
    chunks: [],
    bytes: 0,
    truncated: false,
  };
}

function validateArgs(args: string[]): ResultType<void> {
  if (args.length > MAX_ARGS) {
    return Result.err(`Too many arguments (max ${MAX_ARGS})`);
  }

  let totalArgBytes = 0;
  for (const arg of args) {
    if (arg.includes("\0")) {
      return Result.err("Arguments cannot contain NUL bytes");
    }

    if (arg.length > MAX_ARG_LENGTH) {
      return Result.err(`Argument exceeds ${MAX_ARG_LENGTH} characters`);
    }

    totalArgBytes += Buffer.byteLength(arg);
    if (totalArgBytes > MAX_TOTAL_ARG_BYTES) {
      return Result.err(`Arguments exceed ${MAX_TOTAL_ARG_BYTES} bytes`);
    }
  }

  return Result.ok(undefined);
}

function validateStdin(stdin: string | undefined): ResultType<void> {
  if (stdin === undefined) {
    return Result.ok(undefined);
  }

  if (Buffer.byteLength(stdin) > MAX_STDIN_BYTES) {
    return Result.err(`stdin exceeds ${MAX_STDIN_BYTES} bytes`);
  }

  return Result.ok(undefined);
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
    return Result.err((error as Error).message);
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
    return Result.err((error as Error).message);
  }
}
