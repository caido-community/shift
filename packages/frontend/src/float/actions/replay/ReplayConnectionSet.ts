import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { type FloatToolContext } from "@/float/types";
import { setReplaySessionConnection } from "@/utils/caido";

const inputSchema = z.object({
  host: z.string().min(1).describe("Target host, e.g. example.com"),
  port: z.number().int().min(1).max(65535).describe("Target port"),
  isTLS: z.boolean().describe("Whether to use TLS (HTTPS)"),
  SNI: z.string().nullable().describe("TLS SNI override, or null to use the host"),
});

export const replayConnectionSetTool = tool({
  description:
    "Change the target (host, port, TLS, SNI) of the current replay tab, shown in Replay's URL bar. Read the current target from replay.connection. This does not change the raw request or Host header; editing the Host header alone does not change where the request is sent.",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ host, port, isTLS, SNI }, { experimental_context }) => {
    const { sdk, context } = experimental_context as FloatToolContext;
    const sessionId = (context.replay?.value as { id?: string } | undefined)?.id;
    if (sessionId === undefined) {
      return ToolResult.err("No replay session is selected");
    }

    const result = await setReplaySessionConnection(sdk, sessionId, {
      host,
      port,
      isTLS,
      SNI: SNI ?? undefined,
    });
    if (result.kind === "Error") {
      return ToolResult.err("Failed to change the replay target", result.error);
    }

    return ToolResult.ok({ message: "Replay target updated" });
  },
});
