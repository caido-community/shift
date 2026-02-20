import { tool } from "ai";
import { HttpForge } from "ts-http-forge";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { resolveToolInputPlaceholders } from "@/agent/tools/utils/placeholders";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { truncate, withSuffix } from "@/utils";

const inputSchema = z.object({
  name: z.string().describe("The header name"),
  value: z
    .string()
    .describe(
      "The header value. Supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§"
    ),
});

const outputSchema = ToolResult.schema();

type RequestHeaderAddInput = z.infer<typeof inputSchema>;
type RequestHeaderAddOutput = ToolResultType;

export const display = {
  streaming: ({ input }) =>
    input
      ? [{ text: "Adding " }, { text: truncate(input.name), muted: true }]
      : [{ text: "Adding " }, { text: "header", muted: true }],
  success: ({ input }) =>
    input
      ? [
          { text: "Added header " },
          { text: truncate(input.name), muted: true },
          { text: " with value " },
          { text: truncate(input.value), muted: true },
        ]
      : [{ text: "Added header" }, { text: "header", muted: true }],
  error: ({ input }) => `Failed to add header${withSuffix(input?.name)}`,
} satisfies ToolDisplay<RequestHeaderAddInput>;

export const RequestHeaderAdd = tool({
  description:
    "Add a new HTTP header to the current request without removing existing headers with the same name. Use this for headers that can legitimately appear multiple times (like Accept, Accept-Language, Cookie) or when you specifically want to add a duplicate header for testing purposes. For headers that should have only one value (Authorization, Content-Type, Host), use RequestHeaderSet instead to avoid duplicates. The value supports placeholders like §§§Env§EnvironmentName§Variable_Name§§§ and §§§Blob§blobId§§§. This tool will fail if no HTTP request is currently loaded.",
  inputSchema,
  outputSchema,
  execute: async ({ name, value }, { experimental_context }): Promise<RequestHeaderAddOutput> => {
    const context = experimental_context as AgentContext;
    if (context.httpRequest === "") {
      return ToolResult.err("No HTTP request loaded");
    }
    const resolvedValueResult = await resolveToolInputPlaceholders(context, value);
    if (resolvedValueResult.kind === "Error") {
      return ToolResult.err("Failed to resolve placeholders", resolvedValueResult.error);
    }
    const resolvedValue = resolvedValueResult.value;
    const forge = HttpForge.create(context.httpRequest).addHeader(name, resolvedValue);
    const after = forge.build();
    context.setHttpRequest(after);
    const headers = forge.getHeaders();
    const lowerName = name.toLowerCase();
    const values = headers?.[lowerName] ?? [];
    return ToolResult.ok({
      message: `Header "${name}" added\n${values.map((v) => `${name}: ${v}`).join("\n")}`,
    });
  },
});
