import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { normalizeRawHttpRequest } from "@/agent/utils/http";
import { type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  rawRequest: z.string().describe("Raw HTTP request source (non-empty)"),
  host: z.string().describe("Target host (non-empty)"),
  port: z.number().describe("Target port (integer, positive)"),
  isTls: z.boolean().describe("Whether to use TLS/SSL"),
  sessionName: z
    .string()
    .nullable()
    .describe("Optional name for the replay session. Use null for default."),
});

export const replaySessionCreateTool = tool({
  description: "Create a new replay session with specified request and connection details",
  inputSchema,
  outputSchema: ToolResult.schema(),
  execute: async ({ rawRequest, host, port, isTls, sessionName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const session = await sdk.replay.createSession({
      type: "Raw",
      raw: normalizeRawHttpRequest(rawRequest),
      connectionInfo: { host, port, isTLS: isTls },
    });

    sdk.replay.openTab(session.id);

    if (sessionName !== null) {
      await sdk.replay.renameSession(session.id, sessionName);
    }

    return ToolResult.ok({ message: "Replay session created successfully" });
  },
});
