import { tool } from "ai";
import { type ExecuteAgentBinaryOutput, ExecuteAgentBinaryOutputSchema } from "shared";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";
import { truncate } from "@/utils/text";

const inputSchema = z.object({
  binaryPath: z.string().min(1).describe("Absolute path to a whitelisted binary"),
  args: z.array(z.string()).default([]).describe("Command arguments to pass to the binary"),
  stdin: z.string().optional().describe("Optional stdin data passed to the binary process"),
});

const outputSchema = ToolResult.schema(ExecuteAgentBinaryOutputSchema);

type BinaryExecRunInput = z.infer<typeof inputSchema>;
type BinaryExecRunOutput = ToolResultType<ExecuteAgentBinaryOutput>;

function binaryName(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).pop() ?? path;
}

function formatArgsDisplay(args: string[]): string {
  if (args.length === 0) {
    return "";
  }
  return truncate(args.join(" "), 40);
}

export const display = {
  streaming: ({ input }) => {
    if (!input) {
      return [{ text: "Running " }, { text: "whitelisted binary", muted: true }];
    }
    const name = binaryName(input.binaryPath);
    const argsDisplay = formatArgsDisplay(input.args);
    if (argsDisplay === "") {
      return [{ text: "Running " }, { text: name, muted: true }];
    }
    return [
      { text: "Running " },
      { text: name, muted: true },
      { text: " with " },
      { text: argsDisplay, muted: true },
    ];
  },
  success: ({ input, output }) => {
    if (!isPresent(output)) {
      return [{ text: "Executed " }, { text: "binary", muted: true }];
    }

    const name = input !== undefined ? binaryName(input.binaryPath) : "binary";
    const argsDisplay = input !== undefined ? formatArgsDisplay(input.args) : "";
    const durationMs = output.durationMs;

    if (output.timedOut) {
      return [
        { text: "Timed out " },
        { text: name, muted: true },
        { text: " after " },
        { text: `${durationMs}ms`, muted: true },
      ];
    }

    const exitHint = output.exitCode === 0 ? "" : `, exit ${output.exitCode ?? "?"}`;
    const parts: Array<{ text: string; muted?: boolean }> = [
      { text: "Executed " },
      { text: name, muted: true },
    ];
    if (argsDisplay !== "") {
      parts.push({ text: " with " }, { text: argsDisplay, muted: true }, { text: " in " });
    } else {
      parts.push({ text: " in " });
    }
    parts.push({ text: `${durationMs}ms`, muted: true });
    if (exitHint !== "") {
      parts.push({ text: exitHint, muted: true });
    }
    return parts;
  },
  error: ({ input }) =>
    input ? `Failed to execute binary ${input.binaryPath}` : "Failed to execute binary",
} satisfies ToolDisplay<BinaryExecRunInput, ExecuteAgentBinaryOutput>;

export const BinaryExecRun = tool({
  description:
    "Execute a whitelisted binary for the selected custom agent. Use this for approved external binaries only.",
  inputSchema,
  outputSchema,
  execute: async (
    { binaryPath, args, stdin },
    { abortSignal, experimental_context, toolCallId }
  ): Promise<BinaryExecRunOutput> => {
    const context = experimental_context as AgentContext;
    const agent = context.resolvedAgent;
    if (!isPresent(agent)) {
      return ToolResult.err("No custom agent selected");
    }

    const allowedBinaryPaths = agent.allowedBinaryPaths;
    if (allowedBinaryPaths === undefined || allowedBinaryPaths.length === 0) {
      return ToolResult.err("No binaries are allowed for the selected agent");
    }

    if (!allowedBinaryPaths.includes(binaryPath)) {
      return ToolResult.err(
        "Binary is not allowed",
        `Binary path "${binaryPath}" is not whitelisted`
      );
    }

    const executionId = toolCallId || `binary-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    if (abortSignal?.aborted === true) {
      return ToolResult.err("Binary execution cancelled");
    }

    const runPromise = context.sdk.backend.executeAgentBinary({
      executionId,
      agentId: agent.id,
      binaryPath,
      args,
      stdin,
    });

    let cleanupAbortListener = () => {};
    const abortPromise = new Promise<never>((_, reject) => {
      if (abortSignal === undefined) {
        return;
      }

      const onAbort = () => {
        context.sdk.backend
          .cancelAgentBinaryExecution({ executionId })
          .finally(() => reject(new Error("Binary execution cancelled")));
      };

      if (abortSignal.aborted) {
        onAbort();
        return;
      }

      abortSignal.addEventListener("abort", onAbort, { once: true });
      cleanupAbortListener = () => {
        abortSignal.removeEventListener("abort", onAbort);
      };
    });

    let result;
    try {
      result = await Promise.race([runPromise, abortPromise]);
    } catch (error) {
      return ToolResult.err((error as Error).message);
    } finally {
      cleanupAbortListener();
    }

    if (result.kind === "Error") {
      return ToolResult.err("Binary execution failed", result.error);
    }

    const message = result.value.timedOut ? "Binary execution timed out" : "Binary executed";
    return ToolResult.ok({
      message,
      ...result.value,
    });
  },
});
