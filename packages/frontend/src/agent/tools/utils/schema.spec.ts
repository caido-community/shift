import { describe, expect, it } from "vitest";
import { z } from "zod";

import { collectIds, idListInput, idNumber, scalarOrArray, toArray } from "./schema";

describe("scalarOrArray", () => {
  const schema = scalarOrArray(z.string());

  it("accepts an array", () => {
    expect(schema.parse(["a", "b"])).toEqual(["a", "b"]);
  });

  it("accepts a single scalar", () => {
    expect(schema.parse("a")).toBe("a");
  });
});

describe("toArray", () => {
  it("wraps a scalar", () => {
    expect(toArray("a")).toEqual(["a"]);
  });

  it("passes an array through", () => {
    expect(toArray(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("idNumber", () => {
  it("coerces numeric strings", () => {
    expect(idNumber().parse("7")).toBe(7);
  });

  it("rejects non-positive", () => {
    expect(() => idNumber().parse("0")).toThrow();
  });
});

describe("idListInput + collectIds", () => {
  const schema = idListInput("ids");

  it("accepts ids as an array", () => {
    expect(collectIds(schema.parse({ ids: [1, 2, 3] }))).toEqual([1, 2, 3]);
  });

  it("accepts ids as a single number", () => {
    expect(collectIds(schema.parse({ ids: 5 }))).toEqual([5]);
  });

  it("accepts a singular id alias", () => {
    expect(collectIds(schema.parse({ id: 4 }))).toEqual([4]);
  });

  it("accepts a numeric string for the singular id (the qwen shape)", () => {
    expect(collectIds(schema.parse({ id: "1" }))).toEqual([1]);
  });

  it("accepts numeric strings inside ids", () => {
    expect(collectIds(schema.parse({ ids: ["4", "5"] }))).toEqual([4, 5]);
  });

  it("returns an empty list when neither is provided", () => {
    expect(collectIds(schema.parse({}))).toEqual([]);
  });
});
