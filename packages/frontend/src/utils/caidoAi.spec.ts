import { describe, expect, it } from "vitest";

import type { FrontendSDK } from "../types";

import { listUpstreamProviders } from "./caidoAi";

describe("provider presentation", () => {
  it("distinguishes xAI and Grok while preserving configured aliases and custom endpoints", () => {
    const providers = [
      { id: "xai", kind: "XAI", api: "XAI_RESPONSE", auth: "API_KEY" },
      { id: "grok", kind: "XAI", api: "XAI_RESPONSE", auth: "OAUTH" },
      { id: "personal", kind: "OPENAI", api: "OPENAI_RESPONSE" },
      { id: "work", kind: "OPENAI", api: "OPENAI_COMPLETION" },
      { id: "local", kind: "CUSTOM", api: "OPENAI_RESPONSE" },
    ];
    const sdk = {
      ai: { getUpstreamProviders: () => providers },
    } as unknown as FrontendSDK;

    expect(listUpstreamProviders(sdk)).toEqual([
      { id: "xai", label: "xAI", icon: "xai", isConfigured: true },
      { id: "grok", label: "Grok", icon: "xai", isConfigured: true },
      { id: "personal", label: "OpenAI (personal)", icon: "openai", isConfigured: true },
      { id: "work", label: "OpenAI (work)", icon: "openai", isConfigured: true },
      { id: "local", label: "local", icon: "custom", isConfigured: true },
    ]);

    providers.splice(3, 1);
    expect(listUpstreamProviders(sdk).find((provider) => provider.id === "personal")?.label).toBe(
      "OpenAI"
    );

    providers[0]!.id = "team-api";
    providers[1]!.id = "my-subscription";
    expect(listUpstreamProviders(sdk).slice(0, 2)).toEqual([
      { id: "team-api", label: "xAI", icon: "xai", isConfigured: true },
      { id: "my-subscription", label: "Grok", icon: "xai", isConfigured: true },
    ]);
  });
});
