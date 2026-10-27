import { describe, expect, it, vi } from "vitest";

import { setReplaySessionConnection } from "./caido";

import type { FrontendSDK } from "@/types";

describe("setReplaySessionConnection", () => {
  it("keeps the draft text and placeholders and only swaps the connection", async () => {
    const updateReplayEntryDraft = vi.fn().mockResolvedValue({});
    const showEntry = vi.fn();
    const sdk = {
      replay: { getCurrentSession: () => ({ id: "other-session" }), showEntry },
      graphql: {
        updateReplayEntryDraft,
        replaySessionEntries: vi.fn().mockResolvedValue({
          replaySession: {
            activeEntry: {
              __typename: "ReplayEntryHttp",
              id: "entry-1",
              raw: btoa("GET / HTTP/1.1\r\n\r\n"),
              connection: { host: "old.test", port: 80, isTLS: false },
              settings: { placeholders: [] },
              draft: {
                raw: btoa("GET /draft HTTP/1.1\r\n\r\n"),
                editorState: "{}",
                connection: { host: "old.test", port: 80, isTLS: false },
                settings: {
                  placeholders: [
                    {
                      __typename: "ReplayPlaceholder",
                      inputRange: { __typename: "Range", start: 4, end: 10 },
                      outputRange: { __typename: "Range", start: 4, end: 10 },
                      preprocessors: [
                        { options: { __typename: "ReplayPrefixPreprocessor", value: "x" } },
                      ],
                    },
                  ],
                },
              },
            },
          },
        }),
      },
    } as unknown as FrontendSDK;

    const connection = { host: "new.test", port: 443, isTLS: true };
    const result = await setReplaySessionConnection(sdk, "session-1", connection);

    expect(result.kind).toBe("Ok");
    expect(updateReplayEntryDraft).toHaveBeenCalledWith({
      id: "entry-1",
      input: {
        http: {
          raw: "GET /draft HTTP/1.1\r\n\r\n",
          connection,
          settings: {
            placeholders: [
              {
                inputRange: { start: 4, end: 10 },
                outputRange: { start: 4, end: 10 },
                preprocessors: [{ options: { prefix: { value: "x" } } }],
              },
            ],
          },
          editorState: "{}",
        },
      },
    });
    expect(showEntry).not.toHaveBeenCalled();
  });
});
