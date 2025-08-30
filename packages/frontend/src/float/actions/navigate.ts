import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

export const navigateSchema = z.object({
  name: z.literal("navigate"),
  parameters: z.object({
    path: z.string().min(1).describe("Path of the sidebar tab to navigate to."),
  }),
});

export type navigateInput = z.infer<typeof navigateSchema>;

export const navigate: ActionDefinition<navigateInput> = {
  name: "navigate",
  description: "Navigate to a specific sidebar tab by path",
  inputSchema: navigateSchema,
  execute: (sdk: FrontendSDK, { path }: navigateInput["parameters"]) => {
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
};
