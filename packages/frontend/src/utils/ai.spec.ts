import { MockLanguageModelV3 } from "ai/test";
import { type Model, ModelProvider } from "shared";
import { describe, expect, it, vi } from "vitest";

import type { FrontendSDK } from "../types";

import { createModel, getReasoningEfforts, resolveReasoningEffort } from "./ai";

const createTestModel = (provider: Model["provider"], id: string): Model => ({
  id,
  name: id,
  provider,
  capabilities: {
    reasoning: true,
  },
});

describe("reasoning metadata", () => {
  it("honors provider constraints including minimal and max without alias heuristics", () => {
    const model = {
      ...createTestModel("bedrock-personal", "claude"),
      reasoningEfforts: ["minimal", "high", "max"] as const,
    };
    const available = { ...model, reasoningEfforts: [...model.reasoningEfforts] };
    expect(getReasoningEfforts(available)).toEqual(["minimal", "high", "max"]);
    expect(resolveReasoningEffort(available, "max")).toBe("max");
    expect(resolveReasoningEffort(available, "xhigh")).toBe("high");
    expect(resolveReasoningEffort(available, "medium")).toBe("minimal");
    expect(getReasoningEfforts({ ...available, capabilities: { reasoning: false } })).toEqual([]);
    expect(getReasoningEfforts({ ...available, reasoningEfforts: [] })).toEqual([
      "minimal",
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
  });
});

describe("createModel", () => {
  it("uses fresh registry reasoning constraints when the selected model is stale", () => {
    const languageModel = vi.fn(() => new MockLanguageModelV3());
    const registryModel = {
      id: "model",
      displayName: "Model",
      providerId: "aws-team",
      support: { reasoning: "SUPPORTED" },
      reasoningEfforts: ["minimal", "max"],
    };
    const sdk = {
      ai: {
        createProvider: () => languageModel,
        getUpstreamProviders: () => [],
        getUpstreamModels: () => [registryModel],
      },
    } as unknown as FrontendSDK;
    const selected = {
      ...createTestModel("aws-team", "model"),
      reasoningEfforts: ["low", "high"] as const,
    };
    createModel(
      sdk,
      { ...selected, reasoningEfforts: [...selected.reasoningEfforts] },
      { reasoningEffort: "max" }
    );
    expect(languageModel).toHaveBeenLastCalledWith("aws-team/model", {
      reasoning: { kind: "effort", effort: "max", output: "include" },
    });
    createModel(
      sdk,
      { ...selected, reasoningEfforts: [...selected.reasoningEfforts] },
      { reasoningEffort: "minimal" }
    );
    expect(languageModel).toHaveBeenLastCalledWith("aws-team/model", {
      reasoning: { kind: "effort", effort: "minimal", output: "include" },
    });
    registryModel.support.reasoning = "UNSUPPORTED";
    createModel(
      sdk,
      { ...selected, reasoningEfforts: [...selected.reasoningEfforts] },
      { reasoningEffort: "max" }
    );
    expect(languageModel).toHaveBeenLastCalledWith("aws-team/model", { reasoning: undefined });
  });

  it("uses the tagged reasoning contract and omits reasoning instead of disabling it", () => {
    const languageModel = vi.fn(() => ({}));
    const sdk = {
      ai: {
        createProvider: () => languageModel,
        getUpstreamProviders: () => [],
        getUpstreamModels: () => [],
      },
    } as unknown as FrontendSDK;
    const model = createTestModel(ModelProvider.OpenAI, "gpt-5.6-sol");

    createModel(sdk, model, { reasoningEffort: "high" });
    expect(languageModel).toHaveBeenLastCalledWith("openai/gpt-5.6-sol", {
      reasoning: {
        kind: "effort",
        effort: "high",
        output: "include",
      },
    });

    // The provider default keeps working on models that cannot turn reasoning
    // off, whereas an explicit `disabled` is rejected by them.
    createModel(sdk, model, { reasoning: false });
    expect(languageModel).toHaveBeenLastCalledWith("openai/gpt-5.6-sol", {
      reasoning: undefined,
    });
  });
});
