import { describe, expect, it, vi } from "vitest";

import { shiftAgentTools } from "..";

import type { AgentContext } from "@/agent/context";

vi.mock("@/agent/utils/requestDiff", () => ({
  computeRequestDiff: (before: string, after: string) =>
    before === after ? undefined : { before, after },
}));

const REQUEST = "GET /?q=1 HTTP/1.1\r\nHost: a.test\r\nCookie: c=1\r\nX-H: 1\r\n\r\n";

const edits = {
  RequestBodySet: { body: "x" },
  RequestRawEdit: { oldText: "a.test", newText: "b.test" },
  RequestRawSet: { raw: "GET /x HTTP/1.1\r\nHost: a.test\r\n\r\n" },
};

type EditTool = keyof typeof edits;

function setup(initialRequest = REQUEST) {
  let request = initialRequest;
  const write = vi.fn();
  const context = {
    get httpRequest() {
      return request;
    },
    setHttpRequest: (raw: string) => {
      request = raw;
    },
    writer: { write },
  } as unknown as AgentContext;
  const run = (name: EditTool, input: object, toolCallId: string) => {
    const execute = shiftAgentTools[name].execute as (
      input: object,
      options: { toolCallId: string; experimental_context: AgentContext }
    ) => unknown;
    return execute(input, { toolCallId, experimental_context: context });
  };
  return { run, write, current: () => request };
}

describe("request edit tools", () => {
  it.each(Object.entries(edits) as [EditTool, object][])(
    "%s writes its diff outside the tool output",
    async (name, input) => {
      const { run, write, current } = setup();

      expect(await run(name, input, "call-1")).toEqual({
        kind: "Ok",
        value: { message: expect.any(String) },
      });
      expect(write.mock.calls).toEqual([
        [
          {
            type: "data-request-diff",
            data: { toolCallId: "call-1", before: REQUEST, after: current() },
          },
        ],
      ]);
    }
  );

  it("attributes each parallel edit to its own tool call", async () => {
    const { run, write, current } = setup();

    await Promise.all([
      run("RequestRawEdit", { oldText: "a.test", newText: "b.test" }, "call-1"),
      run("RequestRawEdit", { oldText: "X-H: 1", newText: "X-H: 2" }, "call-2"),
    ]);

    const [first, second] = write.mock.calls.map(([part]) => part.data);
    expect(first).toEqual({ toolCallId: "call-1", before: REQUEST, after: second.before });
    expect(first.after).toContain("Host: b.test");
    expect(first.after).not.toContain("X-H: 2");
    expect(second).toEqual({ toolCallId: "call-2", before: first.after, after: current() });
    expect(second.after).toContain("X-H: 2");
  });

  it("rejects body edits when no request is loaded", async () => {
    const { run, write } = setup("");

    expect(await run("RequestBodySet", { body: "x" }, "call-1")).toEqual({
      kind: "Error",
      error: { message: "No HTTP request loaded", detail: undefined },
    });
    expect(write).not.toHaveBeenCalled();
  });

  it.each([
    ["header add", "X-H: 1\n", "X-H: 1\nX-A: 2\n", "X-H: 1\r\nX-A: 2\r\n\r\n"],
    ["header remove", "X-H: 1\n", "", "Cookie: c=1\r\n\r\n"],
  ])("edits the %s with a raw edit", async (_, oldText, newText, expected) => {
    const { run, current } = setup();

    await run("RequestRawEdit", { oldText, newText }, "call-1");

    expect(current()).toContain(expected);
  });
});
