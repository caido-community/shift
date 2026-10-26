import { createPinia, setActivePinia } from "pinia";
import { Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAgentStore } from "./store";

const backend = vi.hoisted(() => ({ getAgents: vi.fn(), removeAgent: vi.fn() }));

vi.mock("@/plugins/sdk", () => ({ useSDK: () => ({ backend }) }));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("agent store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("forgets a persisted session once it is removed", async () => {
    backend.getAgents.mockResolvedValue(
      Result.ok([
        { chatID: "a", messages: [{}] },
        { chatID: "b", messages: [{}] },
        { chatID: "empty", messages: [] },
      ])
    );
    const store = useAgentStore();
    await flush();

    expect([...store.indicatorStates.keys()]).toEqual(["a", "b"]);

    await store.removeSession("a");

    expect([...store.indicatorStates.keys()]).toEqual(["b"]);
    expect(backend.removeAgent).toHaveBeenCalledWith("a");
  });
});
