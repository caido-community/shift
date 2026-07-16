import { type JSONSchema7, type LanguageModelV3ToolCall } from "@ai-sdk/provider";
import { InvalidToolInputError } from "ai";
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

function schemaIsArray(schema: JSONSchema7 | boolean | undefined): boolean {
  if (schema === undefined || typeof schema === "boolean") {
    return false;
  }

  if (schema.type === "array") {
    return true;
  }

  return [schema.anyOf, schema.oneOf, schema.allOf].some((variants) => {
    if (variants === undefined) {
      return false;
    }

    return variants.some((variant) => schemaIsArray(variant) === true) === true;
  });
}

/**
 * Wrap scalar values in a single-element array when the schema expects an array.
 *
 * Weaker / local models often emit `{"content":"x"}` where the schema requires
 * `{"content":["x"]}`. Left unrepaired, validation fails, the tool never runs,
 * no `tool` result is produced, and the model loops re-issuing the same call.
 */
function coerceScalarsToArrays(schema: JSONSchema7, data: unknown): void {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return;
  }

  const properties = schema.properties;
  if (properties === undefined) {
    return;
  }

  const record = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    const propertySchema = properties[key];
    if (propertySchema === undefined || typeof propertySchema === "boolean") {
      continue;
    }

    if (
      schemaIsArray(propertySchema) &&
      value !== undefined &&
      value !== null &&
      !Array.isArray(value)
    ) {
      record[key] = [value];
      continue;
    }

    coerceScalarsToArrays(propertySchema, value);
  }
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

  coerceScalarsToArrays(schema, data);
  stripOptionalEmptyStrings(schema, data);

  return JSON.stringify(data);
}

/**
 * Attempts one repair pass when the AI returns a tool call that failed input validation.
 *
 * It only runs for `InvalidToolInputError`, looks up the tool's JSON schema, and then
 * tries to normalize the input into something the SDK can validate again.
 *
 * - Malformed JSON like `{limit: 100, ordering: 'DESC',}` can be repaired into valid JSON.
 * - Optional string fields like `"scopeId": ""` can be removed when the schema allows them
 *   to be omitted, so the rest of the tool call can still run.
 */
export async function repairToolCall(
  toolCall: LanguageModelV3ToolCall,
  inputSchema: (options: { toolName: string }) => PromiseLike<JSONSchema7>,
  error: unknown
): Promise<LanguageModelV3ToolCall | undefined> {
  if (!(error instanceof InvalidToolInputError)) {
    return undefined;
  }

  const schema = await inputSchema({ toolName: toolCall.toolName });
  const repairedInput = repairToolInput(toolCall.input, schema);
  if (repairedInput === undefined) {
    return undefined;
  }

  return {
    ...toolCall,
    input: repairedInput,
  };
}
