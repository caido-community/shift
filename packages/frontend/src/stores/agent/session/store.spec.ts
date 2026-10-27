import { describe, expect, it } from "vitest";

import { createSessionStore } from "./store";

describe("session store", () => {
  it("restores a snapshot and drops the ones after it", () => {
    const store = createSessionStore();
    store.setHttpRequest("GET /a");
    store.createSnapshot("m1");
    store.setHttpRequest("GET /b");
    store.createSnapshot("m2");
    store.createSnapshot("m2");

    expect(store.restoreSnapshot("m1")).toEqual({ kind: "Ok", value: "GET /a" });
    expect(store.httpRequest).toBe("GET /a");
    expect(store.hasSnapshot("m2")).toBe(false);
    expect(store.restoreSnapshot("m2")).toEqual({
      kind: "Error",
      error: 'Snapshot for message "m2" not found',
    });
  });
});
