import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { readTextRange } from "@/agent/tools/utils/range";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const DEFAULT_LIMIT = 15000;
const MAX_LIMIT = 30000;

const inputSchema = z.object({
  skillId: z
    .string()
    .min(1)
    .describe(
      "The skill ID from the skills_available_on_demand catalog in additional_instructions, or from a skill tag."
    ),
  offset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Character offset to start reading from (default: 0)."),
  limit: z
    .number()
    .int()
    .positive()
    .max(MAX_LIMIT)
    .optional()
    .describe(
      `Maximum number of characters to return (default: ${DEFAULT_LIMIT}, max: ${MAX_LIMIT}). Omit or use a large value to read the full skill.`
    ),
});

const valueSchema = z.object({
  skillId: z.string(),
  title: z.string(),
  content: z.string(),
  offset: z.number(),
  endOffset: z.number(),
  skillLength: z.number(),
  hasMore: z.boolean(),
});

type ReadSkillInput = z.infer<typeof inputSchema>;
type ReadSkillValue = z.infer<typeof valueSchema>;
type ReadSkillOutput = ToolResultType<ReadSkillValue>;

export const display = {
  streaming: ({ input }) => {
    if (!isPresent(input)) {
      return [{ text: "Reading " }, { text: "skill", muted: true }];
    }
    const offset = input.offset ?? 0;
    const limit = input.limit ?? DEFAULT_LIMIT;
    return [
      { text: "Reading " },
      { text: "skill", muted: true },
      { text: " " },
      { text: input.skillId, muted: true },
      { text: ` [${offset}:${offset + limit}]`, muted: true },
    ];
  },
  success: ({ output }) => {
    if (!isPresent(output)) {
      return [{ text: "Read " }, { text: "skill", muted: true }];
    }
    return [
      { text: "Read skill " },
      { text: output.title, muted: true },
      { text: ` (${output.endOffset - output.offset} chars)` },
      ...(output.hasMore ? [{ text: " (more available)" }] : []),
    ];
  },
  error: () => "Failed to read skill",
} satisfies ToolDisplay<ReadSkillInput, ReadSkillValue>;

export const ReadSkill = tool({
  description:
    "Read instructions from a built-in or selected user skill by its catalog id. Supports pagination with offset and limit; when hasMore is true, continue at endOffset for the remaining content.",
  inputSchema,
  outputSchema: ToolResult.schema(valueSchema),
  execute: (
    { skillId, offset = 0, limit = DEFAULT_LIMIT },
    { experimental_context }
  ): ReadSkillOutput => {
    const context = experimental_context as AgentContext;
    const skill = context.getSkillById(skillId);

    if (skill === undefined) {
      return ToolResult.err(
        "Skill not found",
        `Skill "${skillId}" is not available to this agent. Use an id from the skills_available_on_demand catalog.`
      );
    }

    const range = readTextRange(skill.content, `skill "${skill.title}"`, offset, limit);
    if (range.kind === "Error") {
      return range;
    }
    return ToolResult.ok({
      ...range.value,
      skillId: skill.id,
      title: skill.title,
      skillLength: skill.content.length,
    });
  },
});
