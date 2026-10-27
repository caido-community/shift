import { Result } from "shared";
import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { useLearnings } from "./useLearnings";

const entries = ref<string[]>([]);
const update = vi.fn((index: number, content: string) => {
  entries.value = entries.value.map((entry, i) => (i === index ? content : entry));
  return Promise.resolve(Result.ok(undefined));
});

vi.mock("@/plugins/sdk", () => ({ useSDK: () => ({ window: { showToast: vi.fn() } }) }));
vi.mock("@/stores/learnings", () => ({
  useLearningsStore: () => ({
    get entries() {
      return entries.value;
    },
    update,
  }),
}));

describe("useLearnings", () => {
  it("keeps an in-progress edit when another row is saved", async () => {
    entries.value = ["a", "b"];
    const learnings = useLearnings();

    learnings.setDraft(0, "a2");
    learnings.setDraft(1, "b-typing");
    await learnings.commitLearning(0);
    await nextTick();

    expect(update).toHaveBeenCalledWith(0, "a2");
    expect(learnings.draftOf(0)).toBe("a2");
    expect(learnings.draftOf(1)).toBe("b-typing");
  });

  it("drops an edit when its row changes underneath", async () => {
    entries.value = ["a", "b"];
    const learnings = useLearnings();

    learnings.setDraft(1, "b-typing");
    entries.value = ["b"];
    await nextTick();

    expect(learnings.draftOf(1)).toBe("");
    expect(learnings.draftOf(0)).toBe("b");
  });
});
