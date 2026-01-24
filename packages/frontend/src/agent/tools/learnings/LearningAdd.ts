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
  description:
    "Store a learning entry in the project's persistent memory that will be available across agent sessions. Use this to save important discoveries that should be remembered: valid credentials, API keys, user IDs, session tokens, endpoint patterns, application behavior insights, or any information that would be valuable for future testing. The content should be self-contained and include enough context to be useful later (e.g., 'Admin API key: abc123 - grants access to /api/admin/* endpoints'). Learnings persist until explicitly removed and are included in the agent's context for future sessions. Returns the updated list of all learning entries with their indexes.",
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
