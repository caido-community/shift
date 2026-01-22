import { describe, expect, it } from "vitest";

import { initialModel, type LearningsModel } from "./store.model";
import { update } from "./store.update";

const createTestConfig = (): LearningsModel["config"] => ({
  entries: ["Learning 1", "Learning 2", "Learning 3"],
});

describe("learnings update", () => {
  describe("FETCH_REQUEST", () => {
    it("sets loading state", () => {
      const result = update(initialModel, { type: "FETCH_REQUEST" });

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("FETCH_SUCCESS", () => {
    it("sets config and clears loading", () => {
      const loadingModel: LearningsModel = { ...initialModel, isLoading: true };
      const config = createTestConfig();

      const result = update(loadingModel, { type: "FETCH_SUCCESS", config: config! });

      expect(result.isLoading).toBe(false);
      expect(result.config).toEqual(config);
      expect(result.error).toBeUndefined();
    });
  });

  describe("FETCH_FAILURE", () => {
    it("sets error and clears loading", () => {
      const loadingModel: LearningsModel = { ...initialModel, isLoading: true };

      const result = update(loadingModel, {
        type: "FETCH_FAILURE",
        error: "Network error",
      });

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("ADD_SUCCESS", () => {
    it("adds a new learning", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "ADD_SUCCESS",
        input: { content: "New learning" },
      });

      expect(result.config?.entries).toHaveLength(4);
      expect(result.config?.entries[3]).toBe("New learning");
    });

    it("trims whitespace from content", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "ADD_SUCCESS",
        input: { content: "  Trimmed  " },
      });

      expect(result.config?.entries[3]).toBe("Trimmed");
    });

    it("ignores empty content", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "ADD_SUCCESS",
        input: { content: "   " },
      });

      expect(result).toBe(modelWithConfig);
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "ADD_SUCCESS",
        input: { content: "test" },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("UPDATE_SUCCESS", () => {
    it("updates an existing learning", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { index: 1, content: "Updated" },
      });

      expect(result.config?.entries[1]).toBe("Updated");
      expect(result.config?.entries).toHaveLength(3);
    });

    it("removes learning when content is empty", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { index: 1, content: "   " },
      });

      expect(result.config?.entries).toHaveLength(2);
      expect(result.config?.entries[1]).toBe("Learning 3");
    });

    it("returns unchanged model for invalid index", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { index: 10, content: "Invalid" },
      });

      expect(result).toBe(modelWithConfig);
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "UPDATE_SUCCESS",
        input: { index: 0, content: "test" },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("REMOVE_SUCCESS", () => {
    it("removes learnings by indexes", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "REMOVE_SUCCESS",
        input: { indexes: [0, 2] },
      });

      expect(result.config?.entries).toHaveLength(1);
      expect(result.config?.entries[0]).toBe("Learning 2");
    });

    it("returns unchanged model for empty indexes array", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "REMOVE_SUCCESS",
        input: { indexes: [] },
      });

      expect(result).toBe(modelWithConfig);
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "REMOVE_SUCCESS",
        input: { indexes: [0] },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("SET_SUCCESS", () => {
    it("replaces all learnings", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "SET_SUCCESS",
        entries: ["New 1", "New 2"],
      });

      expect(result.config?.entries).toEqual(["New 1", "New 2"]);
    });

    it("filters out empty entries", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "SET_SUCCESS",
        entries: ["Valid", "  ", "Also valid"],
      });

      expect(result.config?.entries).toEqual(["Valid", "Also valid"]);
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "SET_SUCCESS",
        entries: ["test"],
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("CLEAR_SUCCESS", () => {
    it("clears all learnings", () => {
      const config = createTestConfig();
      const modelWithConfig: LearningsModel = { ...initialModel, config };

      const result = update(modelWithConfig, { type: "CLEAR_SUCCESS" });

      expect(result.config?.entries).toHaveLength(0);
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, { type: "CLEAR_SUCCESS" });

      expect(result).toBe(initialModel);
    });
  });

  describe("mutation failures", () => {
    it("ADD_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "ADD_FAILURE",
        error: "Failed to add",
      });

      expect(result.error).toBe("Failed to add");
    });

    it("UPDATE_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "UPDATE_FAILURE",
        error: "Failed to update",
      });

      expect(result.error).toBe("Failed to update");
    });

    it("REMOVE_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "REMOVE_FAILURE",
        error: "Failed to remove",
      });

      expect(result.error).toBe("Failed to remove");
    });

    it("SET_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "SET_FAILURE",
        error: "Failed to set",
      });

      expect(result.error).toBe("Failed to set");
    });

    it("CLEAR_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "CLEAR_FAILURE",
        error: "Failed to clear",
      });

      expect(result.error).toBe("Failed to clear");
    });
  });

  describe("request messages", () => {
    it("ADD_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "ADD_REQUEST",
        input: { content: "test" },
      });

      expect(result).toBe(initialModel);
    });

    it("UPDATE_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "UPDATE_REQUEST",
        input: { index: 0, content: "test" },
      });

      expect(result).toBe(initialModel);
    });

    it("REMOVE_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "REMOVE_REQUEST",
        input: { indexes: [0] },
      });

      expect(result).toBe(initialModel);
    });

    it("SET_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "SET_REQUEST",
        entries: ["test"],
      });

      expect(result).toBe(initialModel);
    });

    it("CLEAR_REQUEST returns unchanged model", () => {
      const result = update(initialModel, { type: "CLEAR_REQUEST" });

      expect(result).toBe(initialModel);
    });
  });
});
