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
