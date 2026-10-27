import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { setReplaySessionConnection } from "@/utils/caido";

const inputSchema = z.object({
  host: z.string().min(1).describe("Target host, e.g. example.com"),
  port: z.number().int().min(1).max(65535).describe("Target port"),
  isTLS: z.boolean().describe("Whether to use TLS (HTTPS)"),
  SNI: z.string().nullable().describe("TLS SNI override, or null to use the host"),
});

type ReplayConnectionSetInput = z.infer<typeof inputSchema>;

export const display = {
  streaming: () => [{ text: "Changing " }, { text: "target", muted: true }],
  success: ({ input }) => [
    { text: "Changed target to " },
    { text: input !== undefined ? `${input.host}:${input.port}` : "unknown", muted: true },
  ],
  error: () => "Failed to change target",
} satisfies ToolDisplay<ReplayConnectionSetInput>;

export const ReplayConnectionSet = tool({
  description:
    "Change the target (host, port, TLS, SNI) that RequestSend sends the current request to, shown in Replay's URL bar. Read the current target from ContextRead's target field. This does not change the raw request or Host header; editing the Host header alone does not change where the request is sent.",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async (
    { host, port, isTLS, SNI },
    { experimental_context }
  ): Promise<ToolResultType> => {
    const context = experimental_context as AgentContext;
    const result = await setReplaySessionConnection(context.sdk, context.sessionId, {
      host,
      port,
      isTLS,
      SNI: SNI ?? undefined,
    });
    if (result.kind === "Error") {
      return ToolResult.err("Failed to change the replay target", result.error);
    }

    return ToolResult.ok({
      message: `Target set to ${isTLS ? "https" : "http"}://${host}:${port}`,
    });
  },
});
