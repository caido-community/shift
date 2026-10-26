import { describe, expect, it } from "vitest";

import { BACKGROUND_EXECUTION_NOTE } from "./prompt";

describe("BACKGROUND_EXECUTION_NOTE", () => {
  it("includes background-specific execution guidance", () => {
    expect(BACKGROUND_EXECUTION_NOTE).toContain("<background_execution_note>");
    expect(BACKGROUND_EXECUTION_NOTE).toContain("HistoryRowHighlight");
    expect(BACKGROUND_EXECUTION_NOTE).toContain("historyRequestResponseRead");
  });
});
