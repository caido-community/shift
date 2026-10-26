import { createPinia, setActivePinia } from "pinia";
import { defaultSettingsConfig, Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSettingsStore } from "./store";

const backend = vi.hoisted(() => ({ getSettings: vi.fn(), updateSettings: vi.fn() }));
const showToast = vi.hoisted(() => vi.fn());

vi.mock("@/plugins/sdk", () => ({ useSDK: () => ({ backend, window: { showToast } }) }));

const saved = { ...defaultSettingsConfig, floatModel: "openai/gpt-5.5", debugToolsEnabled: true };

describe("settings store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("exposes defaults until the saved settings load", async () => {
    backend.getSettings.mockResolvedValue(Result.ok(saved));
    const store = useSettingsStore();

    expect(store.isLoaded).toBe(false);
    expect(store.config).toEqual(defaultSettingsConfig);

    await store.initialize();

    expect(store.isLoaded).toBe(true);
    expect(store.config).toEqual(saved);
  });

  it("takes the backend's settings after an update", async () => {
    const updated = { ...saved, featureFlags: { ...saved.featureFlags, backgroundAgents: true } };
    backend.updateSettings.mockResolvedValue(Result.ok(updated));
    const store = useSettingsStore();

    await store.update({ featureFlags: { backgroundAgents: true } });

    expect(store.config).toEqual(updated);
    expect(store.isFeatureEnabled("backgroundAgents")).toBe(true);
  });

  it("keeps the current settings and tells the user when an update fails", async () => {
    backend.getSettings.mockResolvedValue(Result.ok(saved));
    backend.updateSettings.mockResolvedValue(Result.err("disk full"));
    const store = useSettingsStore();
    await store.initialize();

    await store.update({ debugToolsEnabled: false });

    expect(store.config).toEqual(saved);
    expect(showToast).toHaveBeenCalledWith("[Shift] Failed to save settings: disk full", {
      variant: "error",
    });
  });
});
