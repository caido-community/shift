import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const highlightColors = ["none", "red", "green", "blue", "purple"] as const;

const colorMap: Record<(typeof highlightColors)[number], string | null> = {
  none: null,
  red: "var(--c-highlight-color-red)",
  green: "var(--c-highlight-color-green)",
  blue: "var(--c-highlight-color-blue)",
  purple: "var(--c-highlight-color-purple)",
};

const inputSchema = z.object({
  metadataId: z
    .string()
    .min(1)
    .describe("Request metadata ID to update. Use metadataId, not requestId or rowId."),
  color: z
    .enum(highlightColors)
    .describe('Highlight color to apply: "none", "red", "green", "blue", or "purple".'),
});

export const historyRowHighlightTool = tool({
  description:
    "Set or clear the highlight color for a history row by request metadata ID. Use metadataId values returned by history tools, not request IDs.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ metadataId, color }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;

    try {
      await sdk.graphql.updateRequestMetadata({
        id: metadataId,
        input: {
          color: colorMap[color],
        },
      });

      return ActionResult.ok(
        color === "none"
          ? `Cleared highlight for history row metadata ${metadataId}`
          : `Set ${color} highlight for history row metadata ${metadataId}`
      );
    } catch (error) {
      return ActionResult.err(
        "Failed to update history row highlight",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
