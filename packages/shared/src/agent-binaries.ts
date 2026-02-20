import { z } from "zod";

export const ExecuteAgentBinaryInputSchema = z.object({
  executionId: z.string().min(1),
  agentId: z.string().min(1),
  binaryPath: z.string().min(1),
  args: z.array(z.string()).default([]),
  stdin: z.string().optional(),
});
export type ExecuteAgentBinaryInput = z.infer<typeof ExecuteAgentBinaryInputSchema>;

export const CancelAgentBinaryExecutionInputSchema = z.object({
  executionId: z.string().min(1),
});
export type CancelAgentBinaryExecutionInput = z.infer<typeof CancelAgentBinaryExecutionInputSchema>;

export const ExecuteAgentBinaryOutputSchema = z.object({
  exitCode: z.number().optional(),
  signal: z.string().optional(),
  timedOut: z.boolean(),
  durationMs: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  stdoutTruncated: z.boolean(),
  stderrTruncated: z.boolean(),
  stdoutBytes: z.number(),
  stderrBytes: z.number(),
});
export type ExecuteAgentBinaryOutput = z.infer<typeof ExecuteAgentBinaryOutputSchema>;

export const AgentBinaryLogChunkStreamSchema = z.enum(["stdout", "stderr"]);
export type AgentBinaryLogChunkStream = z.infer<typeof AgentBinaryLogChunkStreamSchema>;

export const AgentBinaryLogChunkEventSchema = z.object({
  executionId: z.string().min(1),
  stream: AgentBinaryLogChunkStreamSchema,
  delta: z.string(),
});
export type AgentBinaryLogChunkEvent = z.infer<typeof AgentBinaryLogChunkEventSchema>;
