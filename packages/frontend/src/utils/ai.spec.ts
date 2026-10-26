import { MockLanguageModelV3 } from "ai/test";
import { type Model, ModelProvider } from "shared";
import { describe, expect, it, vi } from "vitest";

import type { FrontendSDK } from "../types";

import {
  assertDaybreakSupported,
  createModel,
  DaybreakUnsupportedError,
  getReasoningEfforts,
  resolveReasoningEffort,
} from "./ai";

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

  it.each([
    { id: "my-openai", api: "OPENAI_RESPONSE" },
    { id: "my-codex", api: "CHATGPT_RESPONSE" },
    { id: "my-completions", api: "OPENAI_COMPLETION" },
  ])("applies Fast mode to generation and streaming for $id", async (upstream) => {
    const underlying = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: "done" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        warnings: [],
      },
      doStream: { stream: new ReadableStream() },
    });
    const sdk = {
      ai: {
        createProvider: () => () => underlying,
        getUpstreamProviders: () => [upstream],
        getUpstreamModels: () => [],
      },
    } as unknown as FrontendSDK;
    const model = createTestModel(upstream.id, "gpt-5.6-sol");
    const fastModel = createModel(sdk, model, { fastMode: true });
    const callOptions = {
      prompt: [],
      providerOptions: { openai: { store: false }, other: { custom: "keep" } },
    };

    await fastModel.doGenerate(callOptions);
    await fastModel.doStream(callOptions);

    for (const call of [...underlying.doGenerateCalls, ...underlying.doStreamCalls]) {
      expect(call.providerOptions).toEqual({
        openai: { service_tier: "priority", store: false },
        other: { custom: "keep" },
      });
    }
    expect(callOptions.providerOptions.openai).toEqual({ store: false });

    await createModel(sdk, model, { fastMode: false }).doGenerate(callOptions);
    await createModel(sdk, model).doGenerate(callOptions);
    for (const call of underlying.doGenerateCalls.slice(-2)) {
      expect(call.providerOptions).toEqual(callOptions.providerOptions);
    }
  });

  it.each([
    { id: "openrouter", api: "OPENROUTER" },
    { id: "openai", api: "ANTHROPIC" },
    { id: "another-provider", api: "OPENAI_RESPONSE" },
  ])("leaves unsupported or missing providers unchanged: $id / $api", async (upstream) => {
    const underlying = new MockLanguageModelV3({
      doGenerate: {
        content: [],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 0, text: 0, reasoning: 0 },
        },
        warnings: [],
      },
    });
    const sdk = {
      ai: {
        createProvider: () => () => underlying,
        getUpstreamProviders: () => [upstream],
        getUpstreamModels: () => [],
      },
    } as unknown as FrontendSDK;
    const providerId = upstream.id === "another-provider" ? "missing" : upstream.id;

    await createModel(sdk, createTestModel(providerId, "openai/gpt-5.6-sol"), {
      fastMode: true,
    }).doGenerate({ prompt: [] });

    expect(underlying.doGenerateCalls[0]?.providerOptions).toBeUndefined();
  });

  it.each([
    { kind: "OPENAI", id: "gpt-6.1-sol", daybreak: true, openai: { service_tier: "ultrafast" } },
    {
      kind: "OPENAI",
      id: "gpt-5.6-sol",
      daybreak: false,
      openai: { service_tier: "priority", access_programs: { cyber: "standard" } },
    },
    {
      kind: "OPENAI",
      id: "gpt-6-sol",
      daybreak: true,
      openai: { service_tier: "priority", access_programs: { cyber: "daybreak_blue" } },
    },
    {
      kind: "CHATGPT",
      id: "gpt-6-luna",
      daybreak: true,
      openai: { service_tier: "priority", access_programs: { cyber: "daybreak_blue" } },
    },
    {
      kind: "CHATGPT",
      id: "gpt-6-sol",
      daybreak: false,
      openai: { service_tier: "priority", access_programs: { cyber: "standard" } },
    },
    { kind: "CHATGPT", id: "gpt-6.1-sol", daybreak: true, openai: { service_tier: "priority" } },
    { kind: "BEDROCK", id: "gpt-6-sol", daybreak: true, openai: undefined },
  ])(
    "builds service tier and access program for $kind / $id (Daybreak $daybreak)",
    async ({ kind, id, daybreak, openai }) => {
      const underlying = new MockLanguageModelV3({ doStream: { stream: new ReadableStream() } });
      const sdk = {
        ai: {
          createProvider: () => () => underlying,
          getUpstreamProviders: () => [
            { id: "work", kind, api: kind === "OPENAI" ? "OPENAI_RESPONSE" : `${kind}_RESPONSE` },
          ],
          getUpstreamModels: () => [],
        },
      } as unknown as FrontendSDK;

      const model = createModel(sdk, createTestModel("work", id), {
        fastMode: true,
        ultrafast: true,
        daybreak,
      });
      await model.doStream({ prompt: [] });

      expect(underlying.doStreamCalls[0]?.providerOptions).toEqual(
        openai === undefined ? undefined : { openai }
      );
    }
  );

  it.each([
    {
      kind: "ANTHROPIC",
      providerOptions: { anthropic: { cache_control: { type: "ephemeral" } } },
      maxOutputTokens: 128_000,
    },
    {
      kind: "OPENAI",
      providerOptions: { openai: { prompt_cache_key: "session-1" } },
      maxOutputTokens: undefined,
    },
    { kind: "BEDROCK", providerOptions: undefined, maxOutputTokens: 128_000 },
  ])(
    "sets prompt caching and output limits for $kind",
    async ({ kind, providerOptions, maxOutputTokens }) => {
      const underlying = new MockLanguageModelV3({ doStream: { stream: new ReadableStream() } });
      const sdk = {
        ai: {
          createProvider: () => () => underlying,
          getUpstreamProviders: () => [{ id: "work", kind, api: kind }],
          getUpstreamModels: () => [],
        },
      } as unknown as FrontendSDK;

      const model = createModel(sdk, createTestModel("work", "some-model"), {
        cacheKey: "session-1",
      });
      await model.doStream({ prompt: [] });

      expect(underlying.doStreamCalls[0]?.providerOptions).toEqual(providerOptions);
      expect(underlying.doStreamCalls[0]?.maxOutputTokens).toBe(maxOutputTokens);
    }
  );

  it("refuses OpenAI-family models without Daybreak support only while Daybreak is on", () => {
    const sdk = {
      ai: {
        getUpstreamProviders: () => [
          { id: "work", kind: "CHATGPT" },
          { id: "aws", kind: "BEDROCK" },
        ],
      },
    } as unknown as FrontendSDK;
    expect(() =>
      assertDaybreakSupported(sdk, createTestModel("work", "gpt-6.1-sol"), true)
    ).toThrow(DaybreakUnsupportedError);
    expect(() =>
      assertDaybreakSupported(sdk, createTestModel("work", "gpt-6.1-sol"), false)
    ).not.toThrow();
    expect(() =>
      assertDaybreakSupported(sdk, createTestModel("work", "gpt-6-sol"), true)
    ).not.toThrow();
    expect(() =>
      assertDaybreakSupported(sdk, createTestModel("aws", "gpt-6.1-sol"), true)
    ).not.toThrow();
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

    createModel(sdk, model, { reasoning: false });
    expect(languageModel).toHaveBeenLastCalledWith("openai/gpt-5.6-sol", {
      reasoning: undefined,
    });
  });

  it("replaces lone surrogates that Caido's backend rejects", async () => {
    const underlying = new MockLanguageModelV3({ doStream: { stream: new ReadableStream() } });
    const sdk = {
      ai: {
        createProvider: () => () => underlying,
        getUpstreamProviders: () => [],
        getUpstreamModels: () => [],
      },
    } as unknown as FrontendSDK;
    const truncated = "ok 😀".slice(0, -1);

    await createModel(sdk, createTestModel("work", "some-model")).doStream({
      prompt: [
        { role: "system", content: truncated },
        { role: "user", content: [{ type: "text", text: `${truncated} 😀` }] },
      ],
    });

    expect(underlying.doStreamCalls[0]?.prompt).toEqual([
      { role: "system", content: "ok \uFFFD" },
      { role: "user", content: [{ type: "text", text: "ok \uFFFD 😀" }] },
    ]);
  });
});
