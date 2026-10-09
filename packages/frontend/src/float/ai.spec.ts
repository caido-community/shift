import { generateText } from "ai";
import { type Model, ModelProvider, Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryShift } from "./ai";
import { spawnBackgroundAgent } from "./background/runner";

import type { FrontendSDK } from "@/types";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  setDone: vi.fn(),
}));

const model: Model = {
  id: "gpt-5.6-sol",
  name: "GPT 5.6 Sol",
  provider: ModelProvider.OpenAI,
  capabilities: { reasoning: true },
};

vi.mock("ai", () => ({
  generateText: mocks.generateText,
  stepCountIs: vi.fn(() => "stop-condition"),
}));

vi.mock("@/features", () => ({ isFeatureEnabled: () => false }));
vi.mock("@/float/actions", () => ({
  backgroundFloatTools: {},
  getCoreFloatTools: () => ({}),
}));
vi.mock("@/float/background/prompt", () => ({
  BACKGROUND_EXECUTION_NOTE: "execution note",
  buildBackgroundPrompt: () => "background prompt",
}));
vi.mock("@/float/prompt", () => ({ buildSystemPrompt: () => "system prompt" }));
vi.mock("@/float/toolCallRepair", () => ({ repairToolCall: vi.fn() }));
vi.mock("@/stores/backgroundAgents", () => ({
  useBackgroundAgentsStore: () => ({
    createAgent: () => "agent-1",
    registerController: vi.fn(),
    clearController: vi.fn(),
    setRunning: vi.fn(),
    appendLog: vi.fn(),
    setError: vi.fn(),
    setAborted: vi.fn(),
    setDone: mocks.setDone,
  }),
}));
vi.mock("@/stores/learnings", () => ({
  useLearningsStore: () => ({ entries: [] }),
}));
vi.mock("@/stores/models", () => ({
  useModelsStore: () => ({ getEnabledModels: () => [model] }),
}));
vi.mock("@/stores/settings", () => ({
  useSettingsStore: () => ({
    floatModel: "openai/gpt-5.6-sol",
    maxIterations: 4,
    openRouterPrioritizeFastProviders: false,
  }),
}));
vi.mock("@/utils", () => ({
  createModel: () => ({ modelId: "openai/gpt-5.6-sol" }),
  resolveModel: () => model,
}));

const sdk = {
  window: { showToast: vi.fn() },
} as unknown as FrontendSDK;

describe("float model calls", () => {
  beforeEach(() => {
    mocks.generateText.mockReset();
    mocks.setDone.mockReset();
    mocks.generateText.mockResolvedValue({
      finishReason: "stop",
      toolCalls: [{ toolName: "testTool" }],
    });
  });

  it("does not force sampling parameters for synchronous float actions", async () => {
    const result = await queryShift(sdk, {
      content: "Inspect this",
      context: {},
    });

    expect(result).toEqual(Result.ok(undefined));
    expect(generateText).toHaveBeenCalledWith(
      expect.not.objectContaining({ temperature: expect.anything() })
    );
  });

  it("does not force sampling parameters for background agents", async () => {
    spawnBackgroundAgent({
      sdk,
      task: "Inspect this",
      title: "Inspection",
      context: {},
    });

    await vi.waitFor(() => expect(mocks.setDone).toHaveBeenCalledWith("agent-1"));
    expect(generateText).toHaveBeenCalledWith(
      expect.not.objectContaining({ temperature: expect.anything() })
    );
  });
});
