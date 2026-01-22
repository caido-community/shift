import { tool } from "ai";
import { z } from "zod";

import { ActionResult, type FloatToolContext } from "@/float/types";

const inputSchema = z.object({
  path: z.string().describe("Path of the page to navigate to (non-empty)."),
});

export const navigateTool = tool({
  description: "Navigate to a specific page by path",
  inputSchema,
  outputSchema: ActionResult.schema,
  execute: ({ path }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    let finalPath = path;
    if (path.startsWith("#")) {
      finalPath = path.slice(1);
    }

    sdk.navigation.goTo(finalPath);
    return ActionResult.ok(`Navigated to page ${finalPath}`);
  },
});
