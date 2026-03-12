import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const highlightColors = ["none", "red", "green", "blue", "purple"] as const;

const colorMap: Record<(typeof highlightColors)[number], string> = {
  none: "",
  red: "var(--c-highlight-color-red)",
  green: "var(--c-highlight-color-green)",
  blue: "var(--c-highlight-color-blue)",
  purple: "var(--c-highlight-color-purple)",
};

const inputSchema = z
  .object({
    metadataId: z
      .string()
      .min(1)
      .optional()
      .describe("Single request metadata ID to update. Use metadataId values from history tools."),
    metadataIds: z
      .array(z.string().min(1))
      .max(50)
      .optional()
      .describe(
        "Request metadata IDs to update in batch. Use metadataId values from history tools."
      ),
    color: z
      .enum(highlightColors)
      .describe('Highlight color to apply: "none", "red", "green", "blue", or "purple".'),
  })
  .superRefine((value, context) => {
    const metadataIdsCount = value.metadataIds?.length ?? 0;
    if (value.metadataId === undefined && metadataIdsCount === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide metadataId or metadataIds.",
        path: ["metadataId"],
      });
    }
  });

export const historyRowHighlightTool = tool({
  description:
    "Set or clear the highlight color for one or more history rows by request metadata ID. Use metadataId values returned by history tools, not request IDs.",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: async ({ metadataId, metadataIds, color }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    const ids = [
      ...new Set([metadataId, ...(metadataIds ?? [])].filter((value) => value !== undefined)),
    ];

    try {
      await Promise.all(
        ids.map((id) =>
          sdk.graphql.updateRequestMetadata({
            id,
            input: {
              color: colorMap[color],
            },
          })
        )
      );

      const count = ids.length;
      const metadataLabel =
        count === 1 ? `history row metadata ${ids[0]}` : `${count} history row metadata IDs`;

      return ActionResult.ok(
        color === "none"
          ? `Cleared highlight for ${metadataLabel}`
          : `Set ${color} highlight for ${metadataLabel}`
      );
    } catch (error) {
      return ActionResult.err(
        "Failed to update history row highlight",
        error instanceof Error ? error.message : undefined
      );
    }
  },
});
