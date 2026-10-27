import { Result } from "shared";
import { describe, expect, it, vi } from "vitest";

import { setupRenaming } from "./index";

import type { FrontendSDK } from "@/types";

const mocks = vi.hoisted(() => ({
  renaming: { enabled: true, renameAfterSend: false, instructions: "" },
}));

vi.mock("@/stores/settings", () => ({
  useSettingsStore: () => ({ config: { renaming: mocks.renaming } }),
}));
vi.mock("@/renaming/ai", () => ({
  generateName: () => Promise.resolve(Result.ok("GET /login")),
}));
vi.mock("@/utils/caido", () => ({
  getReplayEntryRequest: () => Promise.resolve(Result.ok({ entry: {} })),
}));

async function* stream<T>(...items: T[]) {
  for (const item of items) {
    yield await Promise.resolve(item);
  }
}

const createSdk = (renameSession: () => Promise<void>) => {
  const showToast = vi.fn();
  const sdk = {
    window: { showToast },
    replay: { renameSession: vi.fn(renameSession) },
    graphql: {
      startedTask: () =>
        stream({
          startedTask: {
            task: {
              __typename: "ReplayTask",
              replayEntry: { id: "entry-2", session: { id: "session-2" } },
            },
          },
        }),
      createdReplaySession: () =>
        stream({
          createdReplaySession: {
            sessionEdge: { node: { id: "session-1", activeEntry: { id: "entry-1" } } },
          },
        }),
    },
  } as unknown as FrontendSDK;
  return { sdk, showToast };
};

describe("setupRenaming", () => {
  vi.stubGlobal("document", { querySelector: () => null });
  vi.stubGlobal("location", { hash: "" });

  it("renames created sessions and skips sent tasks unless renameAfterSend is on", async () => {
    const { sdk } = createSdk(() => Promise.resolve());

    setupRenaming(sdk);

    await vi.waitFor(() =>
      expect(sdk.replay.renameSession).toHaveBeenCalledWith("session-1", "GET /login")
    );
    expect(sdk.replay.renameSession).toHaveBeenCalledTimes(1);
  });

  it("reports rename failures instead of rejecting", async () => {
    const { sdk, showToast } = createSdk(() => Promise.reject(new Error("boom")));

    setupRenaming(sdk);

    await vi.waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("[Shift] Failed while renaming session: boom", {
        variant: "error",
      })
    );
  });
});
