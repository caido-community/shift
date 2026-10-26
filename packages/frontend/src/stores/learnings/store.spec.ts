import { createPinia, setActivePinia } from "pinia";
import { Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLearningsStore } from "./store";

const backend = vi.hoisted(() => ({ getLearnings: vi.fn(), addLearning: vi.fn() }));

vi.mock("@/plugins/sdk", () => ({ useSDK: () => ({ backend }) }));

describe("learnings store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    backend.getLearnings.mockResolvedValue(Result.ok({ entries: ["a"] }));
  });

  it("takes the backend's entries after a mutation", async () => {
    backend.addLearning.mockResolvedValue(Result.ok({ entries: ["a", "b"] }));
    const store = useLearningsStore();
    await store.initialize();

    await expect(store.add("  b  ")).resolves.toEqual(Result.ok(undefined));

    expect(backend.addLearning).toHaveBeenCalledWith({ content: "  b  " });
    expect(store.entries).toEqual(["a", "b"]);
  });

  it("returns the error and keeps entries when the save fails", async () => {
    backend.addLearning.mockResolvedValue(Result.err("disk full"));
    const store = useLearningsStore();
    await store.initialize();

    await expect(store.add("b")).resolves.toEqual(Result.err("disk full"));

    expect(store.entries).toEqual(["a"]);
  });
});
