import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const createReplaySessionSchema = z.object({
  name: z.literal("createReplaySession"),
  parameters: z.object({
    rawRequest: z.string().min(1).describe("Raw HTTP request source"),
    host: z.string().min(1).describe("Target host"),
    port: z.number().positive().describe("Target port"),
    isTls: z.boolean().default(true).describe("Whether to use TLS/SSL"),
    name: z
      .string()
      .describe(
        "Optional name for the replay session. This is optional, leave empty for default.",
      ),
  }),
});

export type CreateReplaySessionInput = z.infer<
  typeof createReplaySessionSchema
>;

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
      name,
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

      sdk.replay.openTab(result.createReplaySession.session!.id);

      if (name !== undefined) {
        const sessionId = result.createReplaySession.session!.id;
        await sdk.graphql.renameReplaySession({
          id: sessionId,
          name,
        });
      }

      return {
        success: true,
        frontend_message: "Replay session created successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create replay session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  },
};
