import { tool } from "ai";
import { z } from "zod";

import {
  actionError,
  actionSuccess,
  withActiveEditorView,
} from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const InputSchema = z.object({
  text: z
    .string()
    .describe("Complete raw HTTP request text to replace in replay editor"),
});

export const replayRequestReplaceTool = tool({
  description:
    "Replace the entire request content in the current replay tab editor",
  inputSchema: InputSchema,
  execute: ({ text }, { experimental_context }) => {
    const { sdk } = experimental_context as FloatToolContext;
    return withActiveEditorView(sdk, (view) => {
      try {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
        });
      } catch (error) {
        return actionError("Failed to replace request in replay editor", error);
      }

      return actionSuccess("Request replaced in replay editor");
    });
  },
});
