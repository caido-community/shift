import { type JSONSchema7 } from "ai";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { repairToolInput } from "./toolCallRepair";

describe("repairToolInput", () => {
  it("removes optional empty string fields", () => {
    const schema = z.toJSONSchema(
      z.object({
        filter: z.string().optional(),
        scopeId: z.string().trim().min(1).optional(),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput('{"filter":"req.path.cont:\\"login\\"","scopeId":""}', schema);

    expect(repaired).toBe('{"filter":"req.path.cont:\\"login\\""}');
  });

  it("preserves required empty string fields", () => {
    const schema = z.toJSONSchema(
      z.object({
        name: z.string(),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput('{"name":""}', schema);

    expect(repaired).toBe('{"name":""}');
  });

  it("repairs malformed json", () => {
    const schema = z.toJSONSchema(
      z.object({
        limit: z.number().int().positive().max(100),
        ordering: z.enum(["ASC", "DESC"]),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput("{limit: 100, ordering: 'DESC',}", schema);

    expect(repaired).toBe('{"limit":100,"ordering":"DESC"}');
  });

  it("keeps schema-invalid values for SDK revalidation", () => {
    const schema = z.toJSONSchema(
      z.object({
        limit: z.number().int().positive().max(100),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput('{"limit":0}', schema);

    expect(repaired).toBe('{"limit":0}');
  });

  it("removes multiple optional empty string fields", () => {
    const schema = z.toJSONSchema(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        tags: z.string().optional(),
        category: z.string().optional(),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput(
      '{"name":"test","description":"","tags":"","category":""}',
      schema
    );

    expect(repaired).toBe('{"name":"test"}');
  });

  it("handles nested objects with optional empty strings", () => {
    const schema = z.toJSONSchema(
      z.object({
        user: z.object({
          name: z.string(),
          email: z.string().optional(),
        }),
        metadata: z.string().optional(),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput('{"user":{"name":"john","email":""},"metadata":""}', schema);

    expect(repaired).toBe('{"user":{"name":"john"}}');
  });

  it("does not coerce values while repairing json", () => {
    const schema = z.toJSONSchema(
      z.object({
        limit: z.number().int().positive().max(100),
        offset: z.number().int().min(0),
      })
    ) as JSONSchema7;

    const repaired = repairToolInput('{"limit":"50","offset":"10"}', schema);

    expect(repaired).toBe('{"limit":"50","offset":"10"}');
  });
});
