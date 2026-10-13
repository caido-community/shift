const TRACE_PREFIX = "[Shift AI trace]";
const TRACE_SESSION_STORAGE_KEY = "shift:ai-trace";
const MAX_CONSOLE_MESSAGE_LENGTH = 4_000;
const TRACE_CHUNK_BYTE_LENGTH = 2_250;

export const AI_TRACE_RUN_ID_HEADER = "X-Caido-AI-Run-Id";

type TraceRecord = {
  source: "shift";
  runId: string;
  timestamp: string;
  stage: string;
  payload: unknown;
};

type TraceChunkRecord = {
  source: "shift";
  runId: string;
  stage: string;
  chunkIndex: number;
  chunkCount: number;
  encoding: "base64";
  data: string;
};

const writeConsoleRecord = (record: TraceRecord) => {
  const serialized = JSON.stringify(record) ?? "null";
  const bytes = new TextEncoder().encode(serialized);
  const message = `${TRACE_PREFIX} ${serialized}`;
  if (TRACE_PREFIX.length + 1 + bytes.length <= MAX_CONSOLE_MESSAGE_LENGTH) {
    console.debug(message);
    return;
  }

  const chunkCount = Math.ceil(bytes.length / TRACE_CHUNK_BYTE_LENGTH);
  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const start = chunkIndex * TRACE_CHUNK_BYTE_LENGTH;
    const data = btoa(
      String.fromCharCode(...bytes.subarray(start, start + TRACE_CHUNK_BYTE_LENGTH))
    );
    const chunk: TraceChunkRecord = {
      source: "shift",
      runId: record.runId,
      stage: record.stage,
      chunkIndex,
      chunkCount,
      encoding: "base64",
      data,
    };
    console.debug(`${TRACE_PREFIX} ${JSON.stringify(chunk)}`);
  }
};

export const isAITraceEnabled = () => {
  try {
    return globalThis.sessionStorage?.getItem(TRACE_SESSION_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const writeAITrace = (enabled: boolean, runId: string, stage: string, value: unknown) => {
  if (!enabled) return;

  const record = (payload: unknown): TraceRecord => ({
    source: "shift",
    runId,
    timestamp: new Date().toISOString(),
    stage,
    payload,
  });

  try {
    writeConsoleRecord(record(value));
  } catch {
    try {
      writeConsoleRecord(record("<unserializable>"));
    } catch {
      return;
    }
  }
};
