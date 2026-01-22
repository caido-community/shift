import { describe, expect, it } from "vitest";

import { initialModel, type ModelsModel } from "./store.model";
import { update } from "./store.update";

const createTestConfig = (): ModelsModel["config"] => ({
  models: [
    {
      id: "gpt-4",
      name: "GPT-4",
      provider: "openai",
      capabilities: { reasoning: true },
    },
  ],
  config: {
    "openai/gpt-4": {
      modelKey: "openai/gpt-4",
      enabled: true,
      enabledFor: ["agent"],
    },
  },
  customModelKeys: [],
});

describe("models update", () => {
  describe("FETCH_REQUEST", () => {
    it("sets loading state", () => {
      const result = update(initialModel, { type: "FETCH_REQUEST" });

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("FETCH_SUCCESS", () => {
    it("sets config and clears loading", () => {
      const loadingModel: ModelsModel = { ...initialModel, isLoading: true };
      const config = createTestConfig();

      const result = update(loadingModel, { type: "FETCH_SUCCESS", config: config! });

      expect(result.isLoading).toBe(false);
      expect(result.config).toEqual(config);
      expect(result.error).toBeUndefined();
    });
  });

  describe("FETCH_FAILURE", () => {
    it("sets error and clears loading", () => {
      const loadingModel: ModelsModel = { ...initialModel, isLoading: true };

      const result = update(loadingModel, {
        type: "FETCH_FAILURE",
        error: "Network error",
      });

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("ADD_MODEL_SUCCESS", () => {
    it("adds a new model to config", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "ADD_MODEL_SUCCESS",
        input: {
          id: "claude-3",
          name: "Claude 3",
          provider: "anthropic",
          capabilities: { reasoning: true },
        },
      });

      expect(result.config?.models).toHaveLength(2);
      expect(result.config?.models[1]?.id).toBe("claude-3");
      expect(result.config?.config["anthropic/claude-3"]).toEqual({
        modelKey: "anthropic/claude-3",
        enabled: true,
        enabledFor: ["agent", "float"],
      });
    });

    it("does not add duplicate model", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "ADD_MODEL_SUCCESS",
        input: {
          id: "gpt-4",
          name: "GPT-4",
          provider: "openai",
          capabilities: { reasoning: true },
        },
      });

      expect(result.config?.models).toHaveLength(1);
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "ADD_MODEL_SUCCESS",
        input: {
          id: "test",
          name: "Test",
          provider: "openai",
          capabilities: { reasoning: false },
        },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("REMOVE_MODEL_SUCCESS", () => {
    it("removes model from config", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "REMOVE_MODEL_SUCCESS",
        input: { provider: "openai", id: "gpt-4" },
      });

      expect(result.config?.models).toHaveLength(0);
      expect(result.config?.config["openai/gpt-4"]).toBeUndefined();
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "REMOVE_MODEL_SUCCESS",
        input: { provider: "openai", id: "gpt-4" },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("UPDATE_CONFIG_SUCCESS", () => {
    it("updates model config", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_CONFIG_SUCCESS",
        key: "openai/gpt-4",
        input: { enabled: false },
      });

      expect(result.config?.config["openai/gpt-4"]?.enabled).toBe(false);
      expect(result.config?.config["openai/gpt-4"]?.enabledFor).toEqual(["agent"]);
    });

    it("returns unchanged model when key does not exist", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_CONFIG_SUCCESS",
        key: "nonexistent/key",
        input: { enabled: false },
      });

      expect(result).toBe(modelWithConfig);
    });
  });

  describe("UPDATE_ENABLED_FOR_SUCCESS", () => {
    it("updates enabledFor array", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_ENABLED_FOR_SUCCESS",
        key: "openai/gpt-4",
        enabledFor: ["agent", "float"],
      });

      expect(result.config?.config["openai/gpt-4"]?.enabledFor).toEqual(["agent", "float"]);
    });

    it("returns unchanged model when key does not exist", () => {
      const config = createTestConfig();
      const modelWithConfig: ModelsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_ENABLED_FOR_SUCCESS",
        key: "nonexistent/key",
        enabledFor: ["agent"],
      });

      expect(result).toBe(modelWithConfig);
    });
  });

  describe("mutation failures", () => {
    it("ADD_MODEL_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "ADD_MODEL_FAILURE",
        error: "Failed to add",
      });

      expect(result.error).toBe("Failed to add");
    });

    it("REMOVE_MODEL_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "REMOVE_MODEL_FAILURE",
        error: "Failed to remove",
      });

      expect(result.error).toBe("Failed to remove");
    });

    it("UPDATE_CONFIG_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "UPDATE_CONFIG_FAILURE",
        error: "Failed to update config",
      });

      expect(result.error).toBe("Failed to update config");
    });

    it("UPDATE_ENABLED_FOR_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "UPDATE_ENABLED_FOR_FAILURE",
        error: "Failed to update enabled for",
      });

      expect(result.error).toBe("Failed to update enabled for");
    });
  });

  describe("request messages", () => {
    it("ADD_MODEL_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "ADD_MODEL_REQUEST",
        input: {
          id: "test",
          name: "Test",
          provider: "openai",
          capabilities: { reasoning: false },
        },
      });

      expect(result).toBe(initialModel);
    });

    it("REMOVE_MODEL_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "REMOVE_MODEL_REQUEST",
        input: { provider: "openai", id: "test" },
      });

      expect(result).toBe(initialModel);
    });

    it("UPDATE_CONFIG_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "UPDATE_CONFIG_REQUEST",
        key: "test",
        input: { enabled: true },
      });

      expect(result).toBe(initialModel);
    });

    it("UPDATE_ENABLED_FOR_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "UPDATE_ENABLED_FOR_REQUEST",
        key: "test",
        input: { enabledFor: ["agent"] },
      });

      expect(result).toBe(initialModel);
    });
  });
});
