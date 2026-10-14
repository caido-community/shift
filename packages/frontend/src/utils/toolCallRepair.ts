import { type JSONSchema7 } from "@ai-sdk/provider";
import { InvalidToolInputError, type ToolCallRepairFunction, type ToolSet } from "ai";
import { jsonrepair } from "jsonrepair";

function schemaAllowsString(schema: JSONSchema7 | boolean | undefined): boolean {
  if (schema === undefined || typeof schema === "boolean") {
    return false;
  }

  if (schema.type === "string") {
    return true;
  }

  if (
    Array.isArray(schema.enum) &&
    schema.enum.every((value: unknown) => typeof value === "string")
  ) {
    return true;
  }

  return [schema.anyOf, schema.oneOf, schema.allOf].some((variants) => {
    if (variants === undefined) {
      return false;
    }

    return variants.some((variant) => schemaAllowsString(variant) === true) === true;
  });
}

function stripOptionalEmptyStrings(schema: JSONSchema7, data: unknown): void {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return;
  }

  const properties = schema.properties;
  if (properties === undefined) {
    return;
  }

  const required = new Set(schema.required ?? []);
  const record = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const propertySchema = properties[key];
    if (propertySchema === undefined || typeof propertySchema === "boolean") {
      continue;
    }

    if (!required.has(key) && value === "" && schemaAllowsString(propertySchema)) {
      delete record[key];
      continue;
    }

    stripOptionalEmptyStrings(propertySchema, value);
  }
}

export function repairToolInput(input: string, schema: JSONSchema7): string | undefined {
  let data: unknown;

  try {
    data = JSON.parse(jsonrepair(input));
  } catch {
    return undefined;
  }

  stripOptionalEmptyStrings(schema, data);

  return JSON.stringify(data);
}

export async function repairToolCall<TOOLS extends ToolSet>({
  toolCall,
  inputSchema,
  error,
}: Parameters<ToolCallRepairFunction<TOOLS>>[0]) {
  if (!InvalidToolInputError.isInstance(error)) {
    return null;
  }

  const repairedInput = repairToolInput(toolCall.input, await inputSchema(toolCall));
  return repairedInput === undefined ? null : { ...toolCall, input: repairedInput };
}
