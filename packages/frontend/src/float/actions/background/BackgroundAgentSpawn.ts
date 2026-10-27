import { tool } from "ai";
import { z } from "zod";

import { ToolResult } from "@/agent/types";
import { spawnBackgroundAgent } from "@/float/background";
import { type FloatToolContext } from "@/float/types";
import { useSettingsStore } from "@/stores/settings";

const inputSchema = z.object({
  task: z
    .string()
    .min(1)
    .describe("Complete task for the background agent to execute with multiple steps."),
  title: z
    .string()
    .optional()
    .describe("Optional short title shown in the background agent panel."),
});

const valueSchema = z.object({
  agentId: z.string(),
});

export const backgroundAgentSpawnTool = tool({
  description:
    "Spawn a background agent for complex multi-step work and return immediately with the background agent ID.",
  inputSchema,
  outputSchema: ToolResult.schema(valueSchema),
  execute: ({ task, title }, { experimental_context }) => {
    if (!useSettingsStore().isFeatureEnabled("backgroundAgents")) {
      return ToolResult.err(
        "Background agents are disabled. Enable '(Experimental) Background Agents for Shift Float' in Settings to use this feature."
      );
    }

    const { sdk, context } = experimental_context as FloatToolContext;
    const backgroundAgentId = spawnBackgroundAgent({
      sdk,
      task,
      title: title ?? "Background task",
      context,
    });

    return ToolResult.ok({
      message: "Background agent started",
      agentId: backgroundAgentId,
    });
  },
});
