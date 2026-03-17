import { describe, expect, it } from "vitest";

import { defaultOpenRouterModelsConfig, openrouterModels } from "./openrouter";

describe("openrouter model registry", () => {
  it("has defaults only for declared models", () => {
    const modelIds = new Set(openrouterModels.map((model) => model.id));

    expect(Object.keys(defaultOpenRouterModelsConfig).every((id) => modelIds.has(id))).toBe(true);
  });
});
