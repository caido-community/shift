import { describe, expect, it, vi } from "vitest";

import { resolveEnvironmentId } from "./EnvironmentRead";

describe("resolveEnvironmentId", () => {
  it("prefers explicit id", async () => {
    const context = {
      sdk: {
        graphql: {
          environments: vi.fn(),
        },
      },
      fetchEnvironmentInfo: vi.fn(),
      selectedEnvironmentId: "selected-env",
    };

    await expect(
      resolveEnvironmentId(context as never, { id: "env-1", name: "Ignored" })
    ).resolves.toBe("env-1");
    expect(context.sdk.graphql.environments).not.toHaveBeenCalled();
  });

  it("resolves by name", async () => {
    const context = {
      sdk: {
        graphql: {
          environments: vi.fn().mockResolvedValue({
            environments: [
              { id: "env-1", name: "Prod" },
              { id: "env-2", name: "Staging" },
            ],
          }),
        },
      },
      fetchEnvironmentInfo: vi.fn(),
      selectedEnvironmentId: "selected-env",
    };

    await expect(resolveEnvironmentId(context as never, { name: "Staging" })).resolves.toBe(
      "env-2"
    );
  });

  it("falls back to the selected environment", async () => {
    const context = {
      sdk: {
        graphql: {
          environments: vi.fn(),
        },
      },
      fetchEnvironmentInfo: vi.fn().mockResolvedValue(undefined),
      selectedEnvironmentId: "selected-env",
    };

    await expect(resolveEnvironmentId(context as never, {})).resolves.toBe("selected-env");
    expect(context.fetchEnvironmentInfo).toHaveBeenCalled();
  });
});
