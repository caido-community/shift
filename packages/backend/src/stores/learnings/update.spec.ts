import { describe, expect, it } from "vitest";

import { createInitialModel, type LearningsModel } from "./model";
import { update } from "./update";

const createTestModel = (): LearningsModel => ({
  entries: ["Learning 1", "Learning 2", "Learning 3"],
});

describe("learnings update", () => {
  describe("ADD_LEARNING", () => {
    it("adds a new learning", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "ADD_LEARNING",
        content: "New learning",
      });

      expect(result.entries).toHaveLength(4);
      expect(result.entries[3]).toBe("New learning");
    });

    it("trims whitespace from content", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "ADD_LEARNING",
        content: "  Trimmed learning  ",
      });

      expect(result.entries[3]).toBe("Trimmed learning");
    });

    it("ignores empty content", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "ADD_LEARNING",
        content: "   ",
      });

      expect(result).toBe(model);
      expect(result.entries).toHaveLength(3);
    });
  });

  describe("UPDATE_LEARNING", () => {
    it("updates an existing learning", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_LEARNING",
        index: 1,
        content: "Updated learning",
      });

      expect(result.entries[1]).toBe("Updated learning");
      expect(result.entries).toHaveLength(3);
    });

    it("removes learning when content is empty", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_LEARNING",
        index: 1,
        content: "   ",
      });

      expect(result.entries).toHaveLength(2);
      expect(result.entries[1]).toBe("Learning 3");
    });

    it("returns unchanged model for invalid index", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_LEARNING",
        index: 10,
        content: "Invalid",
      });

      expect(result).toBe(model);
    });

    it("returns unchanged model for negative index", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_LEARNING",
        index: -1,
        content: "Invalid",
      });

      expect(result).toBe(model);
    });
  });

  describe("REMOVE_LEARNINGS", () => {
    it("removes learnings by indexes", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "REMOVE_LEARNINGS",
        indexes: [0, 2],
      });

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toBe("Learning 2");
    });

    it("returns unchanged model for empty indexes array", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "REMOVE_LEARNINGS",
        indexes: [],
      });

      expect(result).toBe(model);
    });

    it("handles out of range indexes gracefully", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "REMOVE_LEARNINGS",
        indexes: [0, 100],
      });

      expect(result.entries).toHaveLength(2);
    });
  });

  describe("SET_LEARNINGS", () => {
    it("replaces all learnings", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "SET_LEARNINGS",
        entries: ["New 1", "New 2"],
      });

      expect(result.entries).toEqual(["New 1", "New 2"]);
    });

    it("filters out empty entries", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "SET_LEARNINGS",
        entries: ["Valid", "  ", "Also valid"],
      });

      expect(result.entries).toEqual(["Valid", "Also valid"]);
    });
  });

  describe("CLEAR_LEARNINGS", () => {
    it("clears all learnings", () => {
      const model = createTestModel();

      const result = update(model, { type: "CLEAR_LEARNINGS" });

      expect(result.entries).toHaveLength(0);
    });

    it("returns unchanged model when already empty", () => {
      const model: LearningsModel = { entries: [] };

      const result = update(model, { type: "CLEAR_LEARNINGS" });

      expect(result).toBe(model);
    });
  });

  describe("unknown message type", () => {
    it("returns the model unchanged", () => {
      const model = createTestModel();

      const result = update(model, { type: "UNKNOWN" } as never);

      expect(result).toBe(model);
    });
  });

  describe("createInitialModel", () => {
    it("creates initial model with empty entries", () => {
      const model = createInitialModel();

      expect(model.entries).toEqual([]);
    });
  });
});
