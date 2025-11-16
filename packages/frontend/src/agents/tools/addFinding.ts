import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";
import { substituteEnvironmentVariables } from "@/agents/utils/substituteEnvironmentVariables";

const AddFindingSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe(
      "The title of the finding. Supports environment variable substitution.",
    ),
  markdown: z
    .string()
    .min(1)
    .describe(
      "The markdown description of the finding. Supports environment variable substitution.",
    ),
});

export const addFindingTool = tool({
  description:
    "Add a finding with a title and markdown description. Finding represets a discovered vulnerability or interesting behavior that you want to report to the user.",
  inputSchema: AddFindingSchema,
  execute: async (input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    try {
      const title = await substituteEnvironmentVariables(input.title, context);
      const markdown = await substituteEnvironmentVariables(
        input.markdown,
        context,
      );

      const sessionId = context.replaySession.id;
      const requestId =
        (await context.sdk.graphql
          .replayEntriesBySession({ sessionId })
          .then((data) =>
            data.replaySession?.activeEntry?.request?.id?.toString(),
          )) ?? "0";

      await context.sdk.findings.createFinding(requestId, {
        title,
        description: markdown,
        reporter: "Shift Agent",
      });

      return { message: "Finding added" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to add finding: ${message}` };
    }
  },
});
