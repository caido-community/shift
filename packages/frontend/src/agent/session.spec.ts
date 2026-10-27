import type { UIMessageChunk } from "ai";
import { createPinia, setActivePinia } from "pinia";
import type { ShiftMessage } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgentSession } from "./session";

type Run = {
  messages: ShiftMessage[];
  controller: ReadableStreamDefaultController<UIMessageChunk>;
};

const runs = vi.hoisted(() => [] as Run[]);

vi.mock("@/agent/transport", () => ({
  LocalChatTransport: class {
    sendMessages({ messages }: { messages: ShiftMessage[] }) {
      return Promise.resolve(
        new ReadableStream<UIMessageChunk>({
          start(controller) {
            runs.push({ messages: [...messages], controller });
          },
        })
      );
    }
    reconnectToStream() {
      return Promise.resolve(null);
    }
  },
}));

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function finishRun(run: Run, text: string) {
  for (const chunk of [
    { type: "start" },
    { type: "text-start", id: "t" },
    { type: "text-delta", id: "t", delta: text },
    { type: "text-end", id: "t" },
    { type: "finish" },
  ] as UIMessageChunk[]) {
    run.controller.enqueue(chunk);
  }
  run.controller.close();
}

function lastUserText(run: Run | undefined) {
  const message = run?.messages.findLast((m) => m.role === "user");
  return message?.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

function createSession(getAgent: () => Promise<unknown> = () => Promise.resolve({ kind: "Ok" })) {
  const sdk = {
    backend: {
      getAgent: vi.fn(getAgent),
      writeAgent: vi.fn(() => Promise.resolve({ kind: "Ok" })),
    },
  };
  const session = new AgentSession(sdk as never, "session-1", undefined);
  return { session, sdk };
}

beforeEach(() => {
  setActivePinia(createPinia());
  runs.length = 0;
});

describe("AgentSession", () => {
  it("sends only after the persisted history has loaded", async () => {
    let resolveLoad!: (value: unknown) => void;
    const { session } = createSession(() => new Promise((resolve) => (resolveLoad = resolve)));
    const stored = {
      id: "stored-1",
      role: "user",
      parts: [{ type: "text", text: "earlier" }],
    } as ShiftMessage;

    session.send("hello");
    await flush();
    expect(runs).toHaveLength(0);

    resolveLoad({ kind: "Ok", value: { messages: [stored] } });
    await flush();

    expect(runs[0]?.messages.map((m) => m.id)[0]).toBe("stored-1");
    expect(lastUserText(runs[0])).toBe("hello");
  });

  it("queues sends made while loading instead of starting overlapping runs", async () => {
    let resolveLoad!: (value: unknown) => void;
    const { session } = createSession(() => new Promise((resolve) => (resolveLoad = resolve)));

    session.send("first");
    session.send("second");
    resolveLoad({ kind: "Ok" });
    await flush();

    expect(runs).toHaveLength(1);
    expect(session.store.queuedMessages.map((m) => m.text)).toEqual(["second"]);

    finishRun(runs[0]!, "done");
    await flush();
    expect(lastUserText(runs[1])).toBe("second");
  });

  it("reports the phase while a run streams", async () => {
    const { session } = createSession();

    session.send("hello");
    await flush();
    expect(session.phase.value).toBe("waiting");

    const run = runs[0]!;
    run.controller.enqueue({ type: "start" });
    run.controller.enqueue({ type: "text-start", id: "t" });
    run.controller.enqueue({ type: "text-delta", id: "t", delta: "hi" });
    await flush();
    expect(session.phase.value).toBe("streaming");

    run.controller.enqueue({ type: "text-end", id: "t" });
    run.controller.enqueue({ type: "finish" });
    run.controller.close();
    await flush();
    expect(session.phase.value).toBe("idle");
  });

  it("drains the queue after a normal finish but not after a stop", async () => {
    const { session } = createSession();

    session.send("first");
    await flush();
    session.store.addToQueue("second");
    finishRun(runs[0]!, "done");
    await flush();

    expect(runs).toHaveLength(2);
    expect(lastUserText(runs[1])).toBe("second");

    session.store.addToQueue("third");
    await session.stopAndWait();
    await flush();

    expect(runs).toHaveLength(2);
    expect(session.store.queuedMessages.map((m) => m.text)).toEqual(["third"]);

    session.processNextInQueue();
    await flush();
    expect(lastUserText(runs[2])).toBe("third");
  });

  it("stops the chat on dispose and ignores late results", async () => {
    const { session, sdk } = createSession();

    session.send("hello");
    await flush();
    session.dispose();
    await flush();

    expect(session.isGenerating()).toBe(false);
    session.store.setMode("wildcard");
    await session.persistMessages();
    await flush();

    expect(sdk.backend.writeAgent).not.toHaveBeenCalled();
  });
});
