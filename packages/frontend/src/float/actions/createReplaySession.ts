import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  rawRequest: z.string().describe("Raw HTTP request source (non-empty)"),
  host: z.string().describe("Target host (non-empty)"),
  port: z.number().describe("Target port (integer, positive)"),
  isTls: z.boolean().describe("Whether to use TLS/SSL"),
  sessionName: z
    .string()
    .nullable()
    .describe("Optional name for the replay session. Use null for default."),
});

export const createReplaySessionTool = tool({
  description:
    "Create a new replay session with specified request and connection details",
  inputSchema: InputSchema,
  execute: async (
    { rawRequest, host, port, isTls, sessionName },
    { experimental_context },
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
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
        return {
          success: false,
          error: "Failed to create replay session",
        };
      }

      sdk.replay.openTab(sessionId);

      if (sessionName !== null) {
        await sdk.graphql.renameReplaySession({
          id: sessionId,
          name: sessionName,
        });
      }

      return actionSuccess("Replay session created successfully");
    } catch (error) {
      return actionError("Failed to create replay session", error);
    }
  },
});
