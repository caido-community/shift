import { Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LearningRemove } from "./LearningRemove";

const remove = vi.hoisted(() => vi.fn());

vi.mock("@/stores/learnings", () => ({
  useLearningsStore: () => ({ entries: ["a", "b"], remove }),
}));

const run = (indexes: number[]) =>
  LearningRemove.execute?.({ indexes }, { toolCallId: "call-1", messages: [] });

describe("LearningRemove", () => {
  beforeEach(() => {
    remove.mockReset();
    remove.mockResolvedValue(Result.ok(undefined));
  });

  it("removes unique in-range indexes", async () => {
    await expect(run([1, 0, 1])).resolves.toMatchObject({
      kind: "Ok",
      value: { removedIndexes: [1, 0] },
    });
    expect(remove).toHaveBeenCalledWith([1, 0]);
  });

  it("rejects out-of-range indexes without removing anything", async () => {
    await expect(run([0, 2, 5])).resolves.toEqual({
      kind: "Error",
      error: {
        message: "Learning indexes 2, 5 out of range.",
        detail: "Current learnings count: 2",
      },
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
