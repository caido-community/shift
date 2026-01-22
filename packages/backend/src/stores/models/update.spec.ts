import { describe, expect, it } from "vitest";

import { computeRuntimeConfig, createInitialModel, type ModelsModel } from "./model";
import { update } from "./update";

const createTestModel = (): ModelsModel => ({
  customModels: [
    {
      id: "custom-model-1",
      name: "Custom Model 1",
      provider: "openai",
      capabilities: { reasoning: true },
    },
  ],
  configOverrides: {
    "openai/custom-model-1": {
      enabled: true,
      enabledFor: ["agent"],
    },
  },
});

describe("models update", () => {
  describe("ADD_MODEL", () => {
    it("adds a new custom model to the list", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "ADD_MODEL",
        model: {
          id: "custom-model-2",
          name: "Custom Model 2",
          provider: "anthropic",
          capabilities: { reasoning: true },
        },
      });

      expect(result.customModels).toHaveLength(2);
      expect(result.customModels[1]?.id).toBe("custom-model-2");
      expect(result.configOverrides["anthropic/custom-model-2"]).toEqual({
        enabled: true,
        enabledFor: ["agent", "float"],
      });
    });

    it("does not add duplicate custom model", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "ADD_MODEL",
        model: {
          id: "custom-model-1",
          name: "Custom Model 1 Duplicate",
          provider: "openai",
          capabilities: { reasoning: true },
        },
      });

      expect(result.customModels).toHaveLength(1);
      expect(result).toBe(model);
    });

    it("does not add model that matches a built-in model key", () => {
      const model = createInitialModel();
      const runtime = computeRuntimeConfig(model);
      const builtInModel = runtime.models[0];

      if (builtInModel === undefined) {
        return;
      }

      const result = update(model, {
        type: "ADD_MODEL",
        model: builtInModel,
      });

      expect(result.customModels).toHaveLength(0);
      expect(result).toBe(model);
    });
  });

  describe("REMOVE_MODEL", () => {
    it("removes an existing custom model", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "REMOVE_MODEL",
        provider: "openai",
        id: "custom-model-1",
      });

      expect(result.customModels).toHaveLength(0);
      expect(result.configOverrides["openai/custom-model-1"]).toBeUndefined();
    });

    it("does not remove built-in models", () => {
      const model = createInitialModel();
      const runtime = computeRuntimeConfig(model);
      const builtInModel = runtime.models[0];

      if (builtInModel === undefined) {
        return;
      }

      const result = update(model, {
        type: "REMOVE_MODEL",
        provider: builtInModel.provider,
        id: builtInModel.id,
      });

      expect(result).toBe(model);
    });
  });

  describe("UPDATE_CONFIG", () => {
    it("updates config override for custom model", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_CONFIG",
        key: "openai/custom-model-1",
        config: { enabled: false },
      });

      expect(result.configOverrides["openai/custom-model-1"]?.enabled).toBe(false);
      expect(result.configOverrides["openai/custom-model-1"]?.enabledFor).toEqual(["agent"]);
    });

    it("updates config override for built-in model", () => {
      const model = createInitialModel();
      const runtime = computeRuntimeConfig(model);
      const builtInModel = runtime.models[0];

      if (builtInModel === undefined) {
        return;
      }

      const key = `${builtInModel.provider}/${builtInModel.id}`;
      const result = update(model, {
        type: "UPDATE_CONFIG",
        key,
        config: { enabled: false },
      });

      expect(result.configOverrides[key]?.enabled).toBe(false);
    });

    it("returns unchanged model when key does not exist", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_CONFIG",
        key: "nonexistent/key",
        config: { enabled: false },
      });

      expect(result).toBe(model);
    });
  });

  describe("UPDATE_ENABLED_FOR", () => {
    it("updates enabledFor array", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_ENABLED_FOR",
        key: "openai/custom-model-1",
        enabledFor: ["agent", "float"],
      });

      expect(result.configOverrides["openai/custom-model-1"]?.enabledFor).toEqual([
        "agent",
        "float",
      ]);
    });

    it("returns unchanged model when key does not exist", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_ENABLED_FOR",
        key: "nonexistent/key",
        enabledFor: ["agent"],
      });

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
    it("creates initial model with empty user data", () => {
      const model = createInitialModel();

      expect(model.customModels).toHaveLength(0);
      expect(Object.keys(model.configOverrides)).toHaveLength(0);
    });
  });

  describe("computeRuntimeConfig", () => {
    it("merges built-in models with custom models", () => {
      const model = createTestModel();
      const runtime = computeRuntimeConfig(model);

      expect(runtime.models.length).toBeGreaterThan(1);
      expect(runtime.models.some((m) => m.id === "custom-model-1")).toBe(true);
    });

    it("applies config overrides to runtime config", () => {
      const model: ModelsModel = {
        customModels: [],
        configOverrides: {},
      };
      const runtime = computeRuntimeConfig(model);
      const builtInModel = runtime.models[0];

      if (builtInModel === undefined) {
        return;
      }

      const key = `${builtInModel.provider}/${builtInModel.id}`;
      const modelWithOverride: ModelsModel = {
        customModels: [],
        configOverrides: {
          [key]: { enabled: false, enabledFor: [] },
        },
      };
      const overriddenRuntime = computeRuntimeConfig(modelWithOverride);

      expect(overriddenRuntime.config[key]?.enabled).toBe(false);
      expect(overriddenRuntime.config[key]?.enabledFor).toEqual([]);
    });
  });
});
