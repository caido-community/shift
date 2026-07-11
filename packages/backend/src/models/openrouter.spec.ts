import { describe, expect, it } from "vitest";

import { defaultOpenRouterModelsConfig, openrouterModels } from "./openrouter";

describe("openrouter model registry", () => {
  it("includes GPT 5.6 models", () => {
    expect(openrouterModels.map((model) => model.id)).toEqual(
      expect.arrayContaining(["openai/gpt-5.6-luna", "openai/gpt-5.6-terra", "openai/gpt-5.6-sol"])
    );
  });

  it("has defaults only for declared models", () => {
    const modelIds = new Set(openrouterModels.map((model) => model.id));

    expect(Object.keys(defaultOpenRouterModelsConfig).every((id) => modelIds.has(id))).toBe(true);
  });
});
