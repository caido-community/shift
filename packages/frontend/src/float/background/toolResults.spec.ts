import { describe, expect, it } from "vitest";

import { getToolErrorMessage, getToolResultLogParts, getToolSuccessMessage } from "./toolResults";

describe("getToolErrorMessage", () => {
  it("reads structured error messages", () => {
    expect(
      getToolErrorMessage({
        kind: "Error",
        error: {
          message: "Request not found",
        },
      })
    ).toBe("Request not found");
  });

  it("ignores invalid error result shapes", () => {
    expect(
      getToolErrorMessage({
        kind: "Error",
        error: {},
      })
    ).toBeUndefined();
  });

  it("ignores non-error outputs", () => {
    expect(getToolErrorMessage({ kind: "Ok" })).toBeUndefined();
    expect(getToolErrorMessage("error")).toBeUndefined();
  });
});

describe("getToolSuccessMessage", () => {
  it("returns trimmed success messages", () => {
    expect(
      getToolSuccessMessage({
        kind: "Ok",
        value: {
          message: "Created finding",
        },
      })
    ).toBe("Created finding");
  });

  it("ignores blank and non-ok outputs", () => {
    expect(
      getToolSuccessMessage({
        kind: "Ok",
        value: {
          message: "   ",
        },
      })
    ).toBeUndefined();
    expect(getToolSuccessMessage({ kind: "Error" })).toBeUndefined();
  });
});

describe("getToolResultLogParts", () => {
  it("uses specialized tool display parts when available", () => {
    expect(
      getToolResultLogParts(
        "historyRead",
        {},
        {
          kind: "Ok",
          value: {
            message: "Read history",
            totalReturned: 3,
          },
        }
      )
    ).toEqual([
      { text: "Read ", muted: false },
      { text: "3", muted: true },
      { text: " history entries", muted: false },
    ]);
  });

  it("falls back to tool success messages for unknown tools", () => {
    expect(
      getToolResultLogParts(
        "customTool",
        {},
        {
          kind: "Ok",
          value: {
            message: "Custom success",
          },
        }
      )
    ).toEqual([{ text: "Custom success", muted: false }]);
  });

  it("falls back to the completed tool name when no success message exists", () => {
    expect(getToolResultLogParts("uiToast", {}, { kind: "Ok", value: {} })).toEqual([
      { text: "Showed toast", muted: false },
    ]);
  });
});
