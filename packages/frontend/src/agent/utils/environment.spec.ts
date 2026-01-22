import { describe, expect, it } from "vitest";

import {
  createVariableLookup,
  type EnvironmentData,
  substituteEnvironmentVariables,
} from "./environment";

describe("substituteEnvironmentVariables", () => {
  it("replaces single variable reference", () => {
    const lookup = (envName: string, varName: string) => {
      if (envName === "Global" && varName === "api_token") {
        return "1234567890";
      }
      return undefined;
    };

    const result = substituteEnvironmentVariables("Bearer §§§Global§api_token§§§", lookup);
    expect(result).toBe("Bearer 1234567890");
  });

  it("replaces multiple variable references", () => {
    const lookup = (envName: string, varName: string) => {
      if (envName === "Global" && varName === "host") return "api.example.com";
      if (envName === "Global" && varName === "token") return "secret123";
      return undefined;
    };

    const result = substituteEnvironmentVariables(
      "https://§§§Global§host§§§/api?token=§§§Global§token§§§",
      lookup
    );
    expect(result).toBe("https://api.example.com/api?token=secret123");
  });

  it("replaces variables from different environments", () => {
    const lookup = (envName: string, varName: string) => {
      if (envName === "Global" && varName === "base_url") return "https://api.example.com";
      if (envName === "Production" && varName === "api_key") return "prod-key-123";
      return undefined;
    };

    const result = substituteEnvironmentVariables(
      "§§§Global§base_url§§§?key=§§§Production§api_key§§§",
      lookup
    );
    expect(result).toBe("https://api.example.com?key=prod-key-123");
  });

  it("leaves unresolved variables as-is", () => {
    const lookup = () => undefined;

    const result = substituteEnvironmentVariables("Bearer §§§Global§missing_token§§§", lookup);
    expect(result).toBe("Bearer §§§Global§missing_token§§§");
  });

  it("handles text without variables", () => {
    const lookup = () => undefined;

    const result = substituteEnvironmentVariables("No variables here", lookup);
    expect(result).toBe("No variables here");
  });

  it("handles empty string", () => {
    const lookup = () => undefined;

    const result = substituteEnvironmentVariables("", lookup);
    expect(result).toBe("");
  });

  it("handles partial matches (missing closing)", () => {
    const lookup = () => "replaced";

    const result = substituteEnvironmentVariables("§§§Global§token", lookup);
    expect(result).toBe("§§§Global§token");
  });
});

describe("createVariableLookup", () => {
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

    const lookup = createVariableLookup(environments);

    expect(lookup("Global", "api_token")).toBe("1234567890");
    expect(lookup("Global", "base_url")).toBe("https://example.com");
  });

  it("handles multiple environments", () => {
    const environments: EnvironmentData[] = [
      {
        name: "Global",
        variables: [{ name: "token", value: "global-token" }],
      },
      {
        name: "Production",
        variables: [{ name: "token", value: "prod-token" }],
      },
    ];

    const lookup = createVariableLookup(environments);

    expect(lookup("Global", "token")).toBe("global-token");
    expect(lookup("Production", "token")).toBe("prod-token");
  });

  it("returns undefined for missing environment", () => {
    const environments: EnvironmentData[] = [
      {
        name: "Global",
        variables: [{ name: "token", value: "value" }],
      },
    ];

    const lookup = createVariableLookup(environments);

    expect(lookup("Missing", "token")).toBeUndefined();
  });

  it("returns undefined for missing variable", () => {
    const environments: EnvironmentData[] = [
      {
        name: "Global",
        variables: [{ name: "token", value: "value" }],
      },
    ];

    const lookup = createVariableLookup(environments);

    expect(lookup("Global", "missing")).toBeUndefined();
  });

  it("handles empty environments array", () => {
    const lookup = createVariableLookup([]);

    expect(lookup("Global", "token")).toBeUndefined();
  });

  it("handles environment with no variables", () => {
    const environments: EnvironmentData[] = [
      {
        name: "Empty",
        variables: [],
      },
    ];

    const lookup = createVariableLookup(environments);

    expect(lookup("Empty", "token")).toBeUndefined();
  });
});
