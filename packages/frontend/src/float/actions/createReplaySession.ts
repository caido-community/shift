import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

const createReplaySessionSchema = z.object({
  name: z.literal("createReplaySession"),
  parameters: z.object({
    rawRequest: z.string().describe("Raw HTTP request source (non-empty)"),
    host: z.string().describe("Target host (non-empty)"),
    port: z.number().describe("Target port (integer, positive)"),
    isTls: z.boolean().describe("Whether to use TLS/SSL"),
    sessionName: z
      .string()
      .nullable()
      .describe("Optional name for the replay session. Use null for default."),
  }),
});

type CreateReplaySessionInput = z.infer<typeof createReplaySessionSchema>;

export const createReplaySession: ActionDefinition<CreateReplaySessionInput> = {
  name: "createReplaySession",
  description:
    "Create a new replay session with specified request and connection details",
  inputSchema: createReplaySessionSchema,
  execute: async (
    sdk: FrontendSDK,
    {
      rawRequest,
      host,
      port,
      isTls,
      sessionName,
    }: CreateReplaySessionInput["parameters"],
  ) => {
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
};
