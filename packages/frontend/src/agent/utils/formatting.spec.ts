import type { ReasoningTime } from "shared";
import { describe, expect, it } from "vitest";

import { formatReasoningTime } from "./formatting";

describe("formatReasoningTime", () => {
  it("returns undefined when times array is undefined", () => {
    expect(formatReasoningTime(undefined, 0)).toBeUndefined();
  });

  it("returns undefined when index is out of bounds", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 2000 }];
    expect(formatReasoningTime(times, 5)).toBeUndefined();
  });

  it("returns undefined when timing has no start", () => {
    const times: ReasoningTime[] = [{ start: undefined as unknown as number, end: 2000 }];
    expect(formatReasoningTime(times, 0)).toBeUndefined();
  });

  it("returns undefined when timing has no end", () => {
    const times: ReasoningTime[] = [{ start: 1000 }];
    expect(formatReasoningTime(times, 0)).toBeUndefined();
  });

  it("formats sub-500ms durations in milliseconds", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 1400 }];
    expect(formatReasoningTime(times, 0)).toBe("400ms");
  });

  it("rounds 500ms up to 1s", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 1500 }];
    expect(formatReasoningTime(times, 0)).toBe("1s");
  });

  it("formats exactly 1 second as 1s", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 2000 }];
    expect(formatReasoningTime(times, 0)).toBe("1s");
  });

  it("formats multi-second durations in seconds", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 6000 }];
    expect(formatReasoningTime(times, 0)).toBe("5s");
  });

  it("rounds seconds to nearest whole number", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 2600 }];
    expect(formatReasoningTime(times, 0)).toBe("2s");
  });

  it("handles 0ms duration", () => {
    const times: ReasoningTime[] = [{ start: 1000, end: 1000 }];
    expect(formatReasoningTime(times, 0)).toBe("0ms");
  });

  it("accesses correct index in array", () => {
    const times: ReasoningTime[] = [
      { start: 1000, end: 1100 },
      { start: 2000, end: 5000 },
      { start: 3000, end: 3200 },
    ];
    expect(formatReasoningTime(times, 0)).toBe("100ms");
    expect(formatReasoningTime(times, 1)).toBe("3s");
    expect(formatReasoningTime(times, 2)).toBe("200ms");
  });
});
