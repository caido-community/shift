import { describe, expect, it } from "vitest";

import { ActionResult } from "./types";

describe("ActionResult.isOk", () => {
  it("accepts valid ok results", () => {
    expect(ActionResult.isOk(ActionResult.ok("Done"))).toBe(true);
    expect(
      ActionResult.isOk(
        ActionResult.okWithValue({
          message: "Done",
          total: 1,
        })
      )
    ).toBe(true);
  });

  it("rejects invalid ok shapes", () => {
    expect(ActionResult.isOk({ kind: "Ok" })).toBe(false);
    expect(ActionResult.isOk({ kind: "Ok", value: { message: 1 } })).toBe(false);
    expect(ActionResult.isOk({ kind: "Error", error: { message: "nope" } })).toBe(false);
  });
});

describe("ActionResult.isErr", () => {
  it("accepts valid error results", () => {
    expect(ActionResult.isErr(ActionResult.err("Failed"))).toBe(true);
    expect(ActionResult.isErr(ActionResult.err("Failed", "detail"))).toBe(true);
  });

  it("rejects invalid error shapes", () => {
    expect(ActionResult.isErr({ kind: "Error" })).toBe(false);
    expect(ActionResult.isErr({ kind: "Error", error: "Failed" })).toBe(false);
    expect(ActionResult.isErr({ kind: "Error", error: { message: 1 } })).toBe(false);
    expect(ActionResult.isErr({ kind: "Ok", value: { message: "Done" } })).toBe(false);
  });
});
