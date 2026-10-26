import { generateText, streamText } from "ai";
import { type Model, ModelProvider, Result } from "shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryShift } from "./ai";
import { spawnBackgroundAgent } from "./background/runner";

import type { FrontendSDK } from "@/types";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  finishAgent: vi.fn(),
}));

const model: Model = {
  id: "gpt-5.6-sol",
  name: "GPT 5.6 Sol",
  provider: ModelProvider.OpenAI,
  capabilities: { reasoning: true },
};

vi.mock("ai", () => ({
  generateText: mocks.generateText,
  streamText: mocks.streamText,
  stepCountIs: vi.fn(() => "stop-condition"),
}));

vi.mock("@/float/actions", () => ({
  backgroundFloatTools: {},
  getCoreFloatTools: () => ({}),
}));
vi.mock("@/float/background/prompt", () => ({
  BACKGROUND_EXECUTION_NOTE: "execution note",
}));
vi.mock("@/float/prompt", () => ({ buildSystemPrompt: () => "system prompt" }));
vi.mock("@/utils/toolCallRepair", () => ({ repairToolCall: vi.fn() }));
vi.mock("@/stores/backgroundAgents", () => ({
  useBackgroundAgentsStore: () => ({
    createAgent: () => ({ id: "agent-1", signal: new AbortController().signal }),
    setRunning: vi.fn(),
    appendLog: vi.fn(),
    finishAgent: mocks.finishAgent,
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
    config: { floatModel: "openai/gpt-5.6-sol", maxIterations: 4 },
    isFeatureEnabled: () => false,
    getRequestOptions: () => ({}),
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
    mocks.finishAgent.mockReset();
    mocks.generateText.mockResolvedValue({
      finishReason: "stop",
      toolCalls: [{ toolName: "testTool" }],
    });
    mocks.streamText.mockReset();
    mocks.streamText.mockImplementation((options: { onStepFinish: (step: unknown) => void }) => ({
      consumeStream: () => {
        options.onStepFinish({
          toolCalls: [{ toolName: "testTool" }],
          toolResults: [],
          content: [],
          usage: {},
          response: { messages: [] },
        });
        return Promise.resolve();
      },
      text: Promise.resolve("done"),
    }));
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

    await vi.waitFor(() => expect(mocks.finishAgent).toHaveBeenCalledWith("agent-1", "done"));
    expect(streamText).toHaveBeenCalledWith(
      expect.not.objectContaining({ temperature: expect.anything() })
    );
  });
});
