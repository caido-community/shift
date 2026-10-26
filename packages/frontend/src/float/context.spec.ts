import { afterEach, describe, expect, it, vi } from "vitest";

import { getContext } from "./context";

import type { FrontendSDK } from "@/types";

describe("getContext", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves environments before serializing", async () => {
    const environmentContext = { global: { id: "env-1", name: "Global" } };
    const sdk = {
      window: {
        getContext: () => ({ page: { kind: "Search" } }),
        getActiveEditor: () => undefined,
      },
      scopes: { getScopes: () => [] },
      filters: { getAll: () => [] },
      files: { getAll: () => [] },
      workflows: { getWorkflows: () => [] },
      graphql: { environmentContext: vi.fn().mockResolvedValue({ environmentContext }) },
    } as unknown as FrontendSDK;

    vi.stubGlobal("window", { getSelection: () => null });
    vi.stubGlobal("document", { querySelector: () => null });

    const context = await getContext(sdk);

    expect(context.environments?.value).toEqual(environmentContext);
    expect(JSON.stringify(context)).toContain('"name":"Global"');
  });
});
