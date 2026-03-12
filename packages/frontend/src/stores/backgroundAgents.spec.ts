import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { plainParts } from "../backgroundAgents/logs";

import { useBackgroundAgentsStore } from "./backgroundAgents";

describe("background agents store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("creates agents in queued state", () => {
    const store = useBackgroundAgentsStore();

    const id = store.createAgent({
      task: "Test task",
      title: "Test title",
    });

    const agent = store.agents.find((entry) => entry.id === id);
    expect(agent).toBeDefined();
    expect(agent?.status).toBe("queued");
    expect(agent?.title).toBe("Test title");
    expect(agent?.task).toBe("Test task");
  });

  it("transitions from running to done", () => {
    const store = useBackgroundAgentsStore();
    const id = store.createAgent({
      task: "Task",
      title: "Title",
    });

    store.setRunning(id);
    let agent = store.agents.find((entry) => entry.id === id);
    expect(agent?.status).toBe("running");
    expect(agent?.startedAt).toBeTypeOf("number");

    store.setDone(id);
    agent = store.agents.find((entry) => entry.id === id);
    expect(agent?.status).toBe("done");
    expect(agent?.finishedAt).toBeTypeOf("number");
  });

  it("appends logs in order", () => {
    const store = useBackgroundAgentsStore();
    const id = store.createAgent({
      task: "Task",
      title: "Title",
    });

    store.appendLog(id, plainParts("first"));
    store.appendLog(id, plainParts("second"), "success");

    const agent = store.agents.find((entry) => entry.id === id);
    expect(agent?.logs).toHaveLength(2);
    expect(agent?.logs[0]?.parts).toEqual([{ text: "first", muted: false }]);
    expect(agent?.logs[1]?.parts).toEqual([{ text: "second", muted: false }]);
    expect(agent?.logs[1]?.level).toBe("success");
  });

  it("aborts registered controllers on cancel", () => {
    const store = useBackgroundAgentsStore();
    const id = store.createAgent({
      task: "Task",
      title: "Title",
    });

    const controller = new AbortController();
    store.registerController(id, controller);
    store.cancelAgent(id);

    expect(controller.signal.aborted).toBe(true);
  });

  it("clears finished agents and keeps active ones", () => {
    const store = useBackgroundAgentsStore();

    const runningId = store.createAgent({
      task: "Running task",
      title: "Running",
    });
    const doneId = store.createAgent({
      task: "Done task",
      title: "Done",
    });
    const errorId = store.createAgent({
      task: "Error task",
      title: "Error",
    });

    store.setRunning(runningId);
    store.setDone(doneId);
    store.setError(errorId, "failed");

    store.clearFinished();

    expect(store.agents.find((agent) => agent.id === runningId)).toBeDefined();
    expect(store.agents.find((agent) => agent.id === doneId)).toBeUndefined();
    expect(store.agents.find((agent) => agent.id === errorId)).toBeUndefined();
  });
});
