import { tool } from "ai";
import { Result, type Result as ResultType } from "shared";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const inputSchema = z.object({
  jsScript: z
    .string()
    .min(1)
    .describe(
      "JavaScript source code to evaluate. The final expression should return the payload content. Return a string for best results."
    ),
});

const valueSchema = z.object({
  blobId: z.string(),
  length: z.number(),
  preview: z.string(),
});

const outputSchema = ToolResult.schema(valueSchema);

type PayloadBlobCreateInput = z.infer<typeof inputSchema>;
type PayloadBlobCreateValue = z.infer<typeof valueSchema>;
type PayloadBlobCreateOutput = ToolResultType<PayloadBlobCreateValue>;

function normalizeScriptOutput(value: unknown): ResultType<string> {
  if (value === undefined) {
    return Result.err(
      'Return a value from jsScript. Example: \'"A".repeat(1000)\' or \'Array.from({length:1000},()=>"A").join("")\'.'
    );
  }

  if (typeof value === "string") {
    return Result.ok(value);
  }

  if (Array.isArray(value)) {
    const content = value.map((entry) => String(entry)).join("\n");
    return Result.ok(content);
  }

  if (value instanceof Uint8Array) {
    const content = new TextDecoder().decode(value);
    return Result.ok(content);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    value === null
  ) {
    const content = String(value);
    return Result.ok(content);
  }

  if (typeof value === "object") {
    try {
      const content = JSON.stringify(value);
      if (content === undefined) {
        return Result.err("Return a string, number, boolean, array, or Uint8Array from jsScript.");
      }
      return Result.ok(content);
    } catch (error) {
      return Result.err(
        error instanceof Error
          ? error.message
          : "Return a serializable value like string, array, or JSON-safe object."
      );
    }
  }

  return Result.err("Return a string, number, boolean, array, Uint8Array, or JSON-safe object.");
}

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Generating payload blob from " }, { text: "JavaScript", muted: true }]
      : [{ text: "Generating " }, { text: "payload blob", muted: true }],
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Created " }, { text: "payload blob", muted: true }];
    }
    return [{ text: "Created payload blob " }, { text: output.blobId, muted: true }];
  },
  error: () => "Failed to create payload blob",
} satisfies ToolDisplay<PayloadBlobCreateInput, PayloadBlobCreateValue>;

export const PayloadBlobCreate = tool({
  description:
    "Generate a payload blob by evaluating JavaScript. The result is stored in-memory for the current agent run and can be referenced with §§§Blob§blobId§§§ in env-enabled tool inputs.",
  inputSchema,
  outputSchema,
  execute: ({ jsScript }, { experimental_context }): PayloadBlobCreateOutput => {
    const context = experimental_context as AgentContext;

    let scriptResult: unknown;
    try {
      scriptResult = eval(jsScript);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown execution error";
      return ToolResult.err(
        "Payload script execution failed",
        `JavaScript error: ${detail}. Fix the script and ensure the last expression returns payload content.`
      );
    }

    const normalized = normalizeScriptOutput(scriptResult);
    if (normalized.kind === "Error") {
      return ToolResult.err("Payload script returned invalid output", normalized.error);
    }

    try {
      const blob = context.createPayloadBlob(normalized.value);
      return ToolResult.ok({
        message: `Payload blob created (${blob.length} chars)`,
        blobId: blob.blobId,
        length: blob.length,
        preview: blob.preview,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown storage error";
      return ToolResult.err("Failed to store payload blob", detail);
    }
  },
});
