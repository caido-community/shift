import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

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
  outputSchema: ActionResult.schema,
  execute: async ({ rawRequest, host, port, isTls, sessionName }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const result = await sdk.graphql.createReplaySession({
      input: {
        requestSource: {
          raw: {
            raw: rawRequest,
            connectionInfo: {
              host,
              port,
              isTLS: isTls,
            },
          },
        },
      },
    });

    const sessionId = result.createReplaySession.session?.id;

    if (sessionId === undefined) {
      return ActionResult.err("Failed to create replay session");
    }

    sdk.replay.openTab(sessionId);

    if (sessionName !== null) {
      await sdk.graphql.renameReplaySession({
        id: sessionId,
        name: sessionName,
      });
    }

    return ActionResult.ok("Replay session created successfully");
  },
});
