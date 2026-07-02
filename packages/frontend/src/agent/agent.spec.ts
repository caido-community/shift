import type { ModelMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import { prepareCacheStableStep } from "./agent";

describe("prepareCacheStableStep", () => {
  it("refreshes out-of-band metadata without mutating messages or system instructions", async () => {
    const messages: ModelMessage[] = [{ role: "user", content: "test request" }];
    const options = {
      messages,
      system: "static instructions",
      steps: [{ step: 1 }],
    };
    const context = {
      fetchEntriesInfo: vi.fn().mockResolvedValue(undefined),
    };

    const result = await prepareCacheStableStep(context, options);

    expect(context.fetchEntriesInfo).toHaveBeenCalledOnce();
    expect(result).toBe(options);
    expect(result.messages).toBe(messages);
    expect(result.system).toBe("static instructions");
  });

  it("does not add a system override when none was provided", async () => {
    const options = {
      messages: [{ role: "user", content: "test request" }] satisfies ModelMessage[],
    };
    const context = {
      fetchEntriesInfo: vi.fn().mockResolvedValue(undefined),
    };

    const result = await prepareCacheStableStep(context, options);

    expect("system" in result).toBe(false);
  });
});
