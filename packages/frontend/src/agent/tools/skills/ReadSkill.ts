import { tool } from "ai";
import { z } from "zod";

import type { AgentContext } from "@/agent/context";
import { type ToolDisplay, ToolResult, type ToolResult as ToolResultType } from "@/agent/types";
import { isPresent } from "@/utils";

const DEFAULT_LIMIT = 8000;
const MAX_LIMIT = 20000;

export type ReadSkillRangeResult = {
  skillId: string;
  title: string;
  content: string;
  offset: number;
  endOffset: number;
  skillLength: number;
  hasMore: boolean;
};

export function readSkillRange(
  content: string,
  offset: number,
  limit: number
): Pick<ReadSkillRangeResult, "content" | "offset" | "endOffset" | "hasMore"> {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
  const endOffset = Math.min(content.length, safeOffset + safeLimit);
  return {
    content: content.slice(safeOffset, endOffset),
    offset: safeOffset,
    endOffset,
    hasMore: endOffset < content.length,
  };
}

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

const outputSchema = ToolResult.schema(valueSchema);

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
    "Read the full or partial content of a skill that is listed in skills_available_on_demand or referenced by id. Use this when the prompt lists a skill with only a title and description but you need the detailed instructions. Only skills that are currently selected for the agent can be read. Supports pagination with offset and limit for large skills.",
  inputSchema,
  outputSchema,
  execute: ({ skillId, offset, limit }, { experimental_context }): ReadSkillOutput => {
    const context = experimental_context as AgentContext;
    const skill = context.getSkillById(skillId);

    if (skill === undefined) {
      return ToolResult.err(
        "Skill not found",
        `Skill "${skillId}" was not found or is not in the currently selected skills. Use an id from the skills_available_on_demand catalog.`
      );
    }

    const safeOffset = offset ?? 0;
    if (safeOffset >= skill.content.length) {
      return ToolResult.err(
        "Offset out of bounds",
        `Offset ${safeOffset} exceeds skill length ${skill.content.length}`
      );
    }

    const safeLimit = limit ?? DEFAULT_LIMIT;
    const result = readSkillRange(skill.content, safeOffset, safeLimit);

    return ToolResult.ok({
      message: `Read ${result.content.length} chars from skill "${skill.title}"`,
      skillId: skill.id,
      title: skill.title,
      ...result,
      skillLength: skill.content.length,
    });
  },
});
