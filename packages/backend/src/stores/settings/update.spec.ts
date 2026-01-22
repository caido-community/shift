import { describe, expect, it } from "vitest";

import { createInitialModel, type SettingsModel } from "./model";
import { update } from "./update";

const createTestModel = (): SettingsModel => ({
  agentsModel: "anthropic/claude-sonnet-4.5",
  floatModel: "google/gemini-2.5-flash",
  renamingModel: "google/gemini-2.5-flash-lite",
  maxIterations: 35,
  renaming: {
    enabled: false,
    renameAfterSend: false,
    instructions: "Test instructions",
  },
  debugToolsEnabled: true,
  autoCreateShiftCollection: true,
});

describe("settings update", () => {
  describe("UPDATE_SETTINGS", () => {
    it("updates agentsModel", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: { agentsModel: "openai/gpt-4" },
      });

      expect(result.agentsModel).toBe("openai/gpt-4");
      expect(result.floatModel).toBe(model.floatModel);
    });

    it("updates floatModel", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: { floatModel: "openai/gpt-4" },
      });

      expect(result.floatModel).toBe("openai/gpt-4");
    });

    it("updates renamingModel", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: { renamingModel: "openai/gpt-4" },
      });

      expect(result.renamingModel).toBe("openai/gpt-4");
    });

    it("updates maxIterations", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: { maxIterations: 50 },
      });

      expect(result.maxIterations).toBe(50);
    });

    it("updates renaming config partially", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: { renaming: { enabled: true } },
      });

      expect(result.renaming.enabled).toBe(true);
      expect(result.renaming.renameAfterSend).toBe(false);
      expect(result.renaming.instructions).toBe("Test instructions");
    });

    it("updates multiple fields at once", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: {
          agentsModel: "openai/gpt-4",
          maxIterations: 100,
        },
      });

      expect(result.agentsModel).toBe("openai/gpt-4");
      expect(result.maxIterations).toBe(100);
    });

    it("returns unchanged model when input is empty", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_SETTINGS",
        input: {},
      });

      expect(result.agentsModel).toBe(model.agentsModel);
      expect(result.floatModel).toBe(model.floatModel);
    });
  });

  describe("UPDATE_RENAMING", () => {
    it("updates enabled flag", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_RENAMING",
        input: { enabled: true },
      });

      expect(result.renaming.enabled).toBe(true);
      expect(result.renaming.renameAfterSend).toBe(false);
    });

    it("updates renameAfterSend flag", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_RENAMING",
        input: { renameAfterSend: true },
      });

      expect(result.renaming.renameAfterSend).toBe(true);
    });

    it("updates instructions", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_RENAMING",
        input: { instructions: "New instructions" },
      });

      expect(result.renaming.instructions).toBe("New instructions");
    });

    it("updates multiple renaming fields", () => {
      const model = createTestModel();

      const result = update(model, {
        type: "UPDATE_RENAMING",
        input: {
          enabled: true,
          renameAfterSend: true,
          instructions: "Updated",
        },
      });

      expect(result.renaming.enabled).toBe(true);
      expect(result.renaming.renameAfterSend).toBe(true);
      expect(result.renaming.instructions).toBe("Updated");
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
    it("creates initial model with default values", () => {
      const model = createInitialModel();

      expect(model.agentsModel).toBe("");
      expect(model.floatModel).toBe("");
      expect(model.renamingModel).toBe("");
      expect(model.maxIterations).toBe(35);
      expect(model.renaming.enabled).toBe(false);
      expect(model.renaming.renameAfterSend).toBe(false);
    });
  });
});
