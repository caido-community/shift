import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import { beforeEach, describe, expect, it } from "vitest";

import { setSDK } from "../sdk";
import { isRecord } from "../utils";

import { Store } from "./store";

type Model = { items: string[] };

class TestStore extends Store<Model, string> {
  constructor() {
    super({
      filename: "items",
      initialModel: () => ({ items: [] }),
      update: (model, item) => ({ items: [...model.items, item] }),
    });
  }

  protected parse(loaded: unknown): Model | undefined {
    return isRecord(loaded) && Array.isArray(loaded.items) ? (loaded as Model) : undefined;
  }

  add(item: string): Promise<Model> {
    return this.commit(item);
  }
}

let dir: string;
const file = () => path.join(dir, "items.json");
const readStored = () => JSON.parse(readFileSync(file(), "utf-8")) as unknown;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "shift-store-"));
  setSDK({ meta: { path: () => dir } } as never);
});

describe("Store", () => {
  it("uses defaults when the file has invalid JSON", async () => {
    writeFileSync(file(), "{ not json");
    const store = new TestStore();
    await store.load();

    await store.add("a");

    expect(readStored()).toEqual({ items: ["a"] });
  });

  it("appends to loaded data", async () => {
    writeFileSync(file(), JSON.stringify({ items: ["a"] }));
    const store = new TestStore();
    await store.load();

    await store.add("b");

    expect(readStored()).toEqual({ items: ["a", "b"] });
  });

  it("refuses to save before it is loaded", async () => {
    writeFileSync(file(), JSON.stringify({ items: ["a"] }));
    const store = new TestStore();

    await expect(store.add("b")).rejects.toThrow("not loaded");
    expect(readStored()).toEqual({ items: ["a"] });
  });
});
