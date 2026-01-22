import { tool } from "ai";
import { z } from "zod";

import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { useLearningsStore } from "@/stores/learnings";
import { addLearning } from "@/stores/learnings/store.effects";
import { isPresent, truncate } from "@/utils";

const inputSchema = z.object({
  content: z
    .string()
    .describe(
      "The full text of the learning to persist. Include exact IDs, secrets, or notes as they should be recalled later."
    ),
});

const valueSchema = z.object({
  entries: z.array(z.object({ index: z.number(), value: z.string() })),
});

const outputSchema = ToolResult.schema(valueSchema);

type LearningAddInput = z.infer<typeof inputSchema>;
type LearningAddValue = z.infer<typeof valueSchema>;
type LearningAddOutput = ToolResultType<LearningAddValue>;

export const display = {
  streaming: ({ input }) => [
    { text: "Adding learning " },
    { text: isPresent(input?.content) ? truncate(input.content, 40) : "...", muted: true },
  ],
  success: ({ input }) => [
    { text: "Added learning " },
    { text: isPresent(input?.content) ? truncate(input.content, 40) : "entry", muted: true },
  ],
  error: () => "Failed to add learning",
} satisfies ToolDisplay<LearningAddInput, LearningAddValue>;

export const LearningAdd = tool({
  description: `Append a new learning entry to the project memory. Use this when you discover durable insights, IDs, credentials, or other data that future analysis should recall.`,
  inputSchema,
  outputSchema,
  execute: async ({ content }): Promise<LearningAddOutput> => {
    const { sdk, dispatch } = useLearningsStore();
    await addLearning(sdk, dispatch, { content });

    const updatedEntries = useLearningsStore().entries;
    const serialized = updatedEntries.map((value, index) => ({ index, value }));

    return ToolResult.ok({
      message: "Learning stored successfully.",
      entries: serialized,
    });
  },
});
