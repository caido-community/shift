import { type Model } from "shared";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import { useModelSelector } from "./useModelSelector";

import type { ReasoningEffort } from "@/utils/ai";

const mocks = vi.hoisted(() => ({
  providers: [
    { id: "work-codex", kind: "CHATGPT", api: "CHATGPT_RESPONSE" },
    { id: "aws-team", kind: "BEDROCK", api: "BEDROCK" },
    { id: "gemini", kind: "GEMINI", api: "GEMINI" },
    { id: "work-openai", kind: "OPENAI", api: "OPENAI_RESPONSE" },
  ],
}));
vi.mock("@/plugins/sdk", () => ({
  useSDK: () => ({ ai: { getUpstreamProviders: () => mocks.providers } }),
}));
const createModel = (provider: string, reasoning = true, id = "model", name = "Model"): Model => ({
  id,
  name,
  provider,
  capabilities: { reasoning },
  reasoningEfforts: ["low", "high", "max"],
});

function setup(reasoningMode: "standard" | "variant" = "variant") {
  const scope = effectScope();
  const models = ref([
    createModel("work-codex"),
    createModel("aws-team", false),
    createModel("gemini"),
  ]);
  const selectedModel = ref<Model | undefined>(models.value[0]);
  const selectedReasoningEffort = ref<ReasoningEffort>("max");
  const selector = scope.run(() =>
    useModelSelector({
      models,
      selectedModel,
      selectedReasoningEffort,
      disabled: false,
      reasoningMode,
      containerRef: ref<HTMLElement>(),
    })
  )!;
  const pickProvider = (id: string) =>
    selector.handleProviderClick(selector.providers.value.find((p) => p.id === id)!);
  return { scope, models, selectedModel, selectedReasoningEffort, selector, pickProvider };
}

describe("model selector", () => {
  it("selects a model and closes the menu", () => {
    const { scope, selectedModel, selector, pickProvider } = setup("standard");
    try {
      selector.toggle();
      expect(selector.isOpen.value).toBe(true);
      expect(selector.showEffortPicker.value).toBe(false);
      expect(selector.selectedModelLabel.value).toBe("Model");
      pickProvider("gemini");
      selector.handleSelect({ ...selector.listedModels.value[0]!, isConfigured: false });
      expect(selectedModel.value?.provider).toBe("work-codex");
      expect(selector.isOpen.value).toBe(true);
      selector.handleSelect(selector.listedModels.value[0]!);
      expect(selectedModel.value?.provider).toBe("gemini");
      expect(selector.isOpen.value).toBe(false);
    } finally {
      scope.stop();
    }
  });

  it("picks reasoning effort from its own menu and hides it for models that do not reason", async () => {
    const { scope, selectedModel, selectedReasoningEffort, selector, pickProvider } = setup();
    try {
      expect(selector.showEffortPicker.value).toBe(true);
      expect(selector.reasoningEfforts.value).toEqual(["low", "high", "max"]);
      expect(selector.isSelectedEffort("max")).toBe(true);

      selector.toggleEffort();
      expect(selector.isEffortOpen.value).toBe(true);
      selector.handleEffortSelect("medium");
      expect(selector.isEffortOpen.value).toBe(true);
      selector.handleEffortSelect("low");
      expect(selectedReasoningEffort.value).toBe("low");
      expect(selector.isEffortOpen.value).toBe(false);

      selector.toggle();
      pickProvider("aws-team");
      selector.handleSelect(selector.listedModels.value[0]!);
      await nextTick();
      expect(selectedModel.value?.provider).toBe("aws-team");
      expect(selector.showEffortPicker.value).toBe(false);
      selector.toggleEffort();
      expect(selector.isEffortOpen.value).toBe(false);
    } finally {
      scope.stop();
    }
  });

  it("searches across providers and remembers recently picked models", () => {
    const { scope, models, selectedModel, selector } = setup("standard");
    try {
      models.value = [
        createModel("work-codex", true, "sol", "GPT Sol"),
        createModel("gemini", true, "flash", "Gemini Flash"),
        createModel("aws-team", true, "flash", "Bedrock Flash"),
      ];
      selector.toggle();
      selector.query.value = "flash";
      expect(selector.listedModels.value.map((model) => model.name)).toEqual([
        "Gemini Flash",
        "Bedrock Flash",
      ]);
      expect(selector.showProviderLogos.value).toBe(true);
      selector.selectFirstMatch();
      expect(selectedModel.value?.name).toBe("Gemini Flash");
      expect(selector.isOpen.value).toBe(false);
      expect(selector.query.value).toBe("");

      selector.toggle();
      selector.showRecentModels();
      expect(selector.isRecentActive.value).toBe(true);
      expect(selector.listedModels.value.map((model) => model.name)).toEqual(["Gemini Flash"]);
    } finally {
      scope.stop();
    }
  });

  it("names the provider only for models whose names collide in the list", () => {
    const { scope, models, selector } = setup("standard");
    try {
      models.value = [
        createModel("work-codex", true, "luna", "GPT 6 Luna"),
        createModel("work-openai", true, "luna", "GPT 6 Luna"),
        createModel("gemini", true, "flash", "Gemini Flash"),
      ];
      selector.toggle();
      selector.query.value = "a";
      expect(selector.listedModels.value.map(selector.providerSuffix)).toEqual([
        "via ChatGPT",
        "via OpenAI",
        undefined,
      ]);

      selector.query.value = "";
      expect(selector.listedModels.value.map(selector.providerSuffix)).toEqual([undefined]);
    } finally {
      scope.stop();
    }
  });

  it("drops the Claude prefix from displayed names only", () => {
    const { scope, models, selectedModel, selector } = setup("standard");
    try {
      models.value = [createModel("work-codex", true, "opus", "Claude Opus 5.5")];
      selectedModel.value = models.value[0];
      expect(selector.selectedModelLabel.value).toBe("Opus 5.5");
      expect(selector.displayName(models.value[0]!)).toBe("Opus 5.5");
      expect(selectedModel.value?.name).toBe("Claude Opus 5.5");
      selector.toggle();
      selector.query.value = "claude";
      expect(selector.listedModels.value).toHaveLength(1);
    } finally {
      scope.stop();
    }
  });

  it("refreshes selected metadata, constrains effort choices, and normalizes a stale Max selection", async () => {
    const { scope, models, selectedModel, selectedReasoningEffort, selector } = setup();
    try {
      expect(selector.reasoningEfforts.value).toEqual(["low", "high", "max"]);
      expect(selector.reasoningEffort.value).toBe("max");
      models.value = models.value.map((model) => ({
        ...model,
        reasoningEfforts: ["minimal", "high"],
      }));
      await nextTick();
      expect(selectedModel.value?.reasoningEfforts).toEqual(["minimal", "high"]);
      expect(selector.reasoningEfforts.value).toEqual(["minimal", "high"]);
      expect(selectedReasoningEffort.value).toBe("high");
      selector.toggleEffort();
      selector.handleEffortSelect("max");
      expect(selectedReasoningEffort.value).toBe("high");
      expect(selector.isEffortOpen.value).toBe(true);
      selector.handleEffortSelect("minimal");
      expect(selectedReasoningEffort.value).toBe("minimal");
      expect(selector.isEffortOpen.value).toBe(false);
      models.value = models.value.map((model) => ({
        ...model,
        capabilities: { reasoning: false },
      }));
      await nextTick();
      expect(selector.showEffortPicker.value).toBe(false);
    } finally {
      scope.stop();
    }
  });
});
