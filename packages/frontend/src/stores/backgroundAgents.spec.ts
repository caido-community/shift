import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useBackgroundAgentsStore } from "./backgroundAgents";

describe("background agents store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const create = () =>
    useBackgroundAgentsStore().createAgent({
      task: "Task",
      title: "Title",
    });

  const find = (id: string) => useBackgroundAgentsStore().agents.find((agent) => agent.id === id);

  it("transitions from running to finished states", () => {
    const store = useBackgroundAgentsStore();
    const { id } = create();

    store.setRunning(id);
    expect(find(id)?.status).toBe("running");

    store.finishAgent(id, "error", "failed");
    expect(find(id)).toMatchObject({ status: "error", error: "failed" });

    store.setRunning(id);
    store.finishAgent(id, "done");
    expect(find(id)).toMatchObject({ status: "done", error: undefined });
  });

  it("aborts the agent signal on cancel until it finishes", () => {
    const store = useBackgroundAgentsStore();
    const running = create();
    const finished = create();

    store.finishAgent(finished.id, "done");
    store.cancelAgent(finished.id);
    store.cancelAgent(running.id);

    expect(finished.signal.aborted).toBe(false);
    expect(running.signal.aborted).toBe(true);
  });

  it("aborts and removes agents", () => {
    const store = useBackgroundAgentsStore();
    const { id, signal } = create();

    store.removeAgent(id);

    expect(signal.aborted).toBe(true);
    expect(find(id)).toBeUndefined();
  });
});
