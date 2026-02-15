import { defaultSettingsConfig } from "shared";
import { describe, expect, it } from "vitest";

import { initialModel, type SettingsModel } from "./store.model";
import { update } from "./store.update";

const createTestConfig = (): SettingsModel["config"] => ({
  ...defaultSettingsConfig,
  agentsModel: "anthropic/claude-sonnet-4.5",
  floatModel: "google/gemini-2.5-flash",
  renamingModel: "google/gemini-2.5-flash-lite",
  maxIterations: 35,
  renaming: {
    enabled: false,
    renameAfterSend: false,
    instructions: "Test instructions",
  },
});

describe("settings update", () => {
  describe("FETCH_REQUEST", () => {
    it("sets loading state", () => {
      const result = update(initialModel, { type: "FETCH_REQUEST" });

      expect(result.isLoading).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("FETCH_SUCCESS", () => {
    it("sets config and clears loading", () => {
      const loadingModel: SettingsModel = { ...initialModel, isLoading: true };
      const config = createTestConfig();

      const result = update(loadingModel, { type: "FETCH_SUCCESS", config: config! });

      expect(result.isLoading).toBe(false);
      expect(result.config).toEqual(config);
      expect(result.error).toBeUndefined();
    });
  });

  describe("FETCH_FAILURE", () => {
    it("sets error and clears loading", () => {
      const loadingModel: SettingsModel = { ...initialModel, isLoading: true };

      const result = update(loadingModel, {
        type: "FETCH_FAILURE",
        error: "Network error",
      });

      expect(result.isLoading).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("UPDATE_SUCCESS", () => {
    it("updates agentsModel", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { agentsModel: "openai/gpt-4" },
      });

      expect(result.config?.agentsModel).toBe("openai/gpt-4");
      expect(result.config?.floatModel).toBe("google/gemini-2.5-flash");
    });

    it("updates floatModel", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { floatModel: "openai/gpt-4" },
      });

      expect(result.config?.floatModel).toBe("openai/gpt-4");
    });

    it("updates renamingModel", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { renamingModel: "openai/gpt-4" },
      });

      expect(result.config?.renamingModel).toBe("openai/gpt-4");
    });

    it("updates maxIterations", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { maxIterations: 50 },
      });

      expect(result.config?.maxIterations).toBe(50);
    });

    it("updates openRouterPrioritizeFastProviders", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { openRouterPrioritizeFastProviders: true },
      });

      expect(result.config?.openRouterPrioritizeFastProviders).toBe(true);
    });

    it("updates renaming config partially", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_SUCCESS",
        input: { renaming: { enabled: true } },
      });

      expect(result.config?.renaming.enabled).toBe(true);
      expect(result.config?.renaming.renameAfterSend).toBe(false);
      expect(result.config?.renaming.instructions).toBe("Test instructions");
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "UPDATE_SUCCESS",
        input: { agentsModel: "test" },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("UPDATE_RENAMING_SUCCESS", () => {
    it("updates renaming enabled", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_RENAMING_SUCCESS",
        input: { enabled: true },
      });

      expect(result.config?.renaming.enabled).toBe(true);
      expect(result.config?.renaming.renameAfterSend).toBe(false);
    });

    it("updates renaming renameAfterSend", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_RENAMING_SUCCESS",
        input: { renameAfterSend: true },
      });

      expect(result.config?.renaming.renameAfterSend).toBe(true);
    });

    it("updates renaming instructions", () => {
      const config = createTestConfig();
      const modelWithConfig: SettingsModel = { ...initialModel, config };

      const result = update(modelWithConfig, {
        type: "UPDATE_RENAMING_SUCCESS",
        input: { instructions: "New instructions" },
      });

      expect(result.config?.renaming.instructions).toBe("New instructions");
    });

    it("returns unchanged model when config is undefined", () => {
      const result = update(initialModel, {
        type: "UPDATE_RENAMING_SUCCESS",
        input: { enabled: true },
      });

      expect(result).toBe(initialModel);
    });
  });

  describe("mutation failures", () => {
    it("UPDATE_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "UPDATE_FAILURE",
        error: "Failed to update",
      });

      expect(result.error).toBe("Failed to update");
    });

    it("UPDATE_RENAMING_FAILURE sets error", () => {
      const result = update(initialModel, {
        type: "UPDATE_RENAMING_FAILURE",
        error: "Failed to update renaming",
      });

      expect(result.error).toBe("Failed to update renaming");
    });
  });

  describe("request messages", () => {
    it("UPDATE_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "UPDATE_REQUEST",
        input: { agentsModel: "test" },
      });

      expect(result).toBe(initialModel);
    });

    it("UPDATE_RENAMING_REQUEST returns unchanged model", () => {
      const result = update(initialModel, {
        type: "UPDATE_RENAMING_REQUEST",
        input: { enabled: true },
      });

      expect(result).toBe(initialModel);
    });
  });
});
