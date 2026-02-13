import { describe, expect, it } from "vitest";

import {
  createEnvironmentLookup,
  type EnvironmentData,
  resolvePlaceholders,
  substituteEnvironmentPlaceholders,
} from "./placeholders";

import type { FrontendSDK } from "@/types";

describe("substituteEnvironmentPlaceholders", () => {
  it("replaces single env placeholder", () => {
    const lookup = (envName: string, varName: string) => {
      if (envName === "Global" && varName === "api_token") {
        return "1234567890";
      }
      return undefined;
    };

    const result = substituteEnvironmentPlaceholders("Bearer §§§Env§Global§api_token§§§", lookup);
    expect(result).toBe("Bearer 1234567890");
  });

  it("replaces multiple placeholders", () => {
    const lookup = (envName: string, varName: string) => {
      if (envName === "Global" && varName === "host") return "api.example.com";
      if (envName === "Global" && varName === "token") return "secret123";
      return undefined;
    };

    const result = substituteEnvironmentPlaceholders(
      "https://§§§Env§Global§host§§§/api?token=§§§Env§Global§token§§§",
      lookup
    );
    expect(result).toBe("https://api.example.com/api?token=secret123");
  });

  it("leaves unresolved values unchanged", () => {
    const lookup = () => undefined;
    const result = substituteEnvironmentPlaceholders(
      "Bearer §§§Env§Global§missing_token§§§",
      lookup
    );
    expect(result).toBe("Bearer §§§Env§Global§missing_token§§§");
  });
});

describe("createEnvironmentLookup", () => {
  it("creates lookup from environment data", () => {
    const environments: EnvironmentData[] = [
      {
        name: "Global",
        variables: [
          { name: "api_token", value: "1234567890" },
          { name: "base_url", value: "https://example.com" },
        ],
      },
    ];

    const lookup = createEnvironmentLookup(environments);
    expect(lookup("Global", "api_token")).toBe("1234567890");
    expect(lookup("Global", "base_url")).toBe("https://example.com");
    expect(lookup("Global", "missing")).toBeUndefined();
  });
});

describe("resolvePlaceholders", () => {
  it("returns error when blob placeholder is unresolved", async () => {
    const sdk = {} as FrontendSDK;
    const result = await resolvePlaceholders(sdk, "A=§§§Blob§blob-1§§§", {
      payloadBlobLookup: () => undefined,
    });
    expect(result).toEqual({
      kind: "Error",
      error:
        'Payload blob "blob-1" was not found in this run. Create it with PayloadBlobCreate and retry using the returned blobId.',
    });
  });

  it("resolves blob placeholder when lookup is present", async () => {
    const sdk = {} as FrontendSDK;
    const result = await resolvePlaceholders(sdk, "A=§§§Blob§blob-1§§§", {
      payloadBlobLookup: (blobId) => (blobId === "blob-1" ? "AAAA" : undefined),
    });
    expect(result).toEqual({ kind: "Ok", value: "A=AAAA" });
  });

  it("returns error when blob placeholder is used without lookup", async () => {
    const sdk = {} as FrontendSDK;
    const result = await resolvePlaceholders(sdk, "A=§§§Blob§blob-1§§§");
    expect(result).toEqual({
      kind: "Error",
      error:
        "Payload blob placeholders are not available in this context. Create a blob with PayloadBlobCreate and retry with §§§Blob§blobId§§§.",
    });
  });
});
