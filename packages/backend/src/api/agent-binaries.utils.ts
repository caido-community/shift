import { Buffer } from "buffer";

import { Result, type Result as ResultType } from "shared";

const MAX_ARGS = 32;
const MAX_ARG_LENGTH = 2_048;
const MAX_TOTAL_ARG_BYTES = 16_384;
const MAX_STDIN_BYTES = 65_536;
const MAX_STDIO_BYTES = 65_536;

export type CollectedStream = {
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

export function appendStreamChunk(stream: CollectedStream, data: unknown): Buffer | undefined {
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

export function createStreamCollector(): CollectedStream {
  return {
    chunks: [],
    bytes: 0,
    truncated: false,
  };
}

export function validateArgs(args: string[]): ResultType<void> {
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

export function validateStdin(stdin: string | undefined): ResultType<void> {
  if (stdin === undefined) {
    return Result.ok(undefined);
  }

  if (Buffer.byteLength(stdin) > MAX_STDIN_BYTES) {
    return Result.err(`stdin exceeds ${MAX_STDIN_BYTES} bytes`);
  }

  return Result.ok(undefined);
}
