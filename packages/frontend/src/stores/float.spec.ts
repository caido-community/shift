import { createPinia, setActivePinia } from "pinia";
import { Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFloatStore } from "./float";

const mocks = vi.hoisted(() => ({
  queryShift: vi.fn(),
  closeFloat: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock("@/float", () => ({ queryShift: mocks.queryShift, closeFloat: mocks.closeFloat }));
vi.mock("@/float/context", () => ({ getContext: () => Promise.resolve({}) }));
vi.mock("@/plugins/sdk", () => ({ useSDK: () => ({ window: { showToast: mocks.showToast } }) }));

describe("float store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("stays running until an aborted query settles", async () => {
    let signal: AbortSignal | undefined;
    mocks.queryShift.mockImplementation(
      (_sdk, input: { abortSignal: AbortSignal }) =>
        new Promise((resolve) => {
          signal = input.abortSignal;
          signal.addEventListener("abort", () => resolve(Result.err("Request aborted")));
        })
    );
    const store = useFloatStore();
    store.query = "find js files";

    const run = store.runQuery();
    await vi.waitFor(() => expect(signal).toBeDefined());
    expect(store.isRunning).toBe(true);

    store.stopQuery();
    expect(signal?.aborted).toBe(true);
    await run;

    expect(store.isRunning).toBe(false);
    expect(mocks.showToast).not.toHaveBeenCalled();
    expect(mocks.closeFloat).not.toHaveBeenCalled();
  });

  it("closes the float and records history on success", async () => {
    mocks.queryShift.mockResolvedValue(Result.ok(undefined));
    const store = useFloatStore();

    store.query = "first";
    await store.runQuery();
    store.query = "second";
    await store.runQuery();

    expect(mocks.closeFloat).toHaveBeenCalledTimes(2);
    expect(store.query).toBe("");

    expect(store.navigateHistory("next")).toBe(false);
    expect(store.navigateHistory("prev")).toBe(true);
    expect(store.query).toBe("second");
    store.navigateHistory("prev");
    store.navigateHistory("prev");
    expect(store.query).toBe("first");
    store.navigateHistory("next");
    store.navigateHistory("next");
    expect(store.query).toBe("");
    expect(store.navigateHistory("next")).toBe(false);
  });
});
