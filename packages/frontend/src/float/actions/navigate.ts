import { tool } from "ai";
import { z } from "zod";

import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  path: z
    .string()
    .describe("Path of the sidebar tab to navigate to (non-empty)."),
});

export const navigateTool = tool({
  description: "Navigate to a specific sidebar tab by path",
  inputSchema: InputSchema,
  execute: ({ path }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    let finalPath = path;
    if (path.startsWith("#")) {
      finalPath = path.slice(1);
    }

    sdk.navigation.goTo(finalPath);
    return {
      success: true,
      frontend_message: `Navigated to sidebar page ${finalPath}`,
    };
  },
});
