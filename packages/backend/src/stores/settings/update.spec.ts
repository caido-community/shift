import { DEFAULT_MAX_ITERATIONS, defaultFeatureFlags } from "shared";
import { describe, expect, it } from "vitest";

import { createInitialModel, parseStoredSettings } from "./model";
import { update } from "./update";

describe("settings update", () => {
  it("merges per-model preferences without resetting other models", () => {
    const initial = {
      ...createInitialModel(),
      modelPreferences: { "work/model": { fastMode: true } },
    };

    const result = update(initial, {
      type: "UPDATE_SETTINGS",
      input: { modelPreferences: { "personal/model": { fastMode: true } } },
    });

    expect(result.modelPreferences).toEqual({
      "work/model": { fastMode: true },
      "personal/model": { fastMode: true },
    });
    expect(initial.modelPreferences).toEqual({ "work/model": { fastMode: true } });
  });

  it("keeps debugToolsEnabled across a save and reload", () => {
    const saved = update(createInitialModel(), {
      type: "UPDATE_SETTINGS",
      input: { debugToolsEnabled: true },
    });

    expect(parseStoredSettings(JSON.parse(JSON.stringify(saved)))?.debugToolsEnabled).toBe(true);
  });
});

describe("parseStoredSettings", () => {
  it("fills fields missing from older files", () => {
    const result = parseStoredSettings({ renaming: { enabled: true }, featureFlags: {} });

    expect(result?.renaming.enabled).toBe(true);
    expect(result?.renaming.instructions).toBe(createInitialModel().renaming.instructions);
    expect(result?.featureFlags).toEqual(defaultFeatureFlags);
  });

  it("raises the legacy default iteration limit", () => {
    expect(parseStoredSettings({ maxIterations: 100 })?.maxIterations).toBe(DEFAULT_MAX_ITERATIONS);
  });
});
