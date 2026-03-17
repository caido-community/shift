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
    const results = await Promise.allSettled(
      ids.map(async (id) => {
        await sdk.graphql.updateRequestMetadata({
          id,
          input: {
            color: colorMap[color],
          },
        });

        return id;
      })
    );

    const updatedIds = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    );
    const failedIds = results.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return [];
      }

      const id = ids[index];
      console.error(`Failed to update history row highlight for metadata ${id}:`, result.reason);
      return [id];
    });

    if (updatedIds.length === 0) {
      return ActionResult.err(
        "Failed to update history row highlight",
        failedIds.length > 0 ? `Failed metadata IDs: ${failedIds.join(", ")}` : undefined
      );
    }

    const describeIds = (values: string[]): string =>
      values.length === 1
        ? `history row metadata ${values[0]}`
        : `${values.length} history row metadata IDs`;
    const action = color === "none" ? "Cleared highlight for" : `Set ${color} highlight for`;

    return ActionResult.ok(
      failedIds.length === 0
        ? `${action} ${describeIds(updatedIds)}`
        : `${action} ${describeIds(updatedIds)}. Failed to update ${describeIds(failedIds)}.`
    );
  },
});
