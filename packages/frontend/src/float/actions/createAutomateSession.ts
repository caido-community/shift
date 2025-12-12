import {
  type AutomatePayloadInput,
  type AutomatePayloadOptionsInput,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import { tool } from "ai";
import { z } from "zod";

import { actionError, actionSuccess } from "@/float/actionUtils";
import { type FloatToolContext } from "@/float/types";

const MARKER = "§§§";

const concurrencySchema = z.object({
  delay: z.number().describe("Delay in ms between requests (integer, >= 0)"),
  workers: z.number().describe("Parallel workers (integer, 1-100)"),
});

const numbersPayloadSchema = z.object({
  kind: z.literal("Numbers"),
  start: z.number().describe("Start of inclusive range (integer)"),
  end: z.number().describe("End of inclusive range (integer)"),
});

const hostedFilePayloadSchema = z.object({
  kind: z.literal("HostedFile"),
  id: z.string().describe("Hosted file ID (non-empty)"),
});

const listPayloadSchema = z.object({
  kind: z.literal("List"),
  list: z.array(z.string()).describe("List of strings (non-empty array)"),
});

const payloadSchema = z.discriminatedUnion("kind", [
  numbersPayloadSchema,
  hostedFilePayloadSchema,
  listPayloadSchema,
]);

const InputSchema = z.object({
  rawRequest: z
    .string()
    .describe(
      "Raw HTTP request with placeholder markers '§§§start§§§' and '§§§end§§§' pairs (non-empty)",
    ),
  host: z.string().describe("Target host (non-empty)"),
  port: z.number().describe("Target port (integer, positive)"),
  isTls: z.boolean().describe("Whether to use TLS/SSL"),
  strategy: z.enum(["ALL", "MATRIX", "PARALLEL", "SEQUENTIAL"]),
  concurrency: concurrencySchema
    .nullable()
    .describe("Concurrency settings. This is optional, use null for default."),
  payloads: z
    .array(payloadSchema)
    .describe(
      "Array of payload definitions. This is optional, use empty array for default.",
    ),
});

type AutomatePayload = z.infer<typeof payloadSchema>;

const extractPlaceholders = (source: string) => {
  const positions: number[] = [];
  let working = source;
  let searchFrom = 0;
  while (true) {
    const idx = working.indexOf(MARKER, searchFrom);
    if (idx === -1) break;
    positions.push(idx);
    working = working.slice(0, idx) + working.slice(idx + MARKER.length);
    searchFrom = idx;
  }

  const placeholders: { start: number; end: number }[] = [];
  for (let i = 0; i < positions.length; i += 2) {
    const start = positions[i];
    const end = positions[i + 1];
    if (start !== undefined && end !== undefined && end >= start) {
      placeholders.push({ start, end });
    }
  }

  return { sanitized: working, placeholders };
};

const toGraphQLPayload = (
  payload: AutomatePayload,
): AutomatePayloadOptionsInput => {
  if (payload.kind === "Numbers") {
    return {
      number: {
        range: {
          start: payload.start,
          end: payload.end,
        },
        increments: 1,
        minLength: 1,
      },
    };
  }

  if (payload.kind === "HostedFile") {
    return {
      hostedFile: {
        id: payload.id,
      },
    };
  }

  return {
    simpleList: {
      list: payload.list,
    },
  };
};

const attachDefaultPreprocessors = (
  graphPayloads: AutomatePayloadOptionsInput[],
): AutomatePayloadInput[] => {
  return graphPayloads.map((options) => ({
    options,
    preprocessors: [
      {
        options: {
          urlEncode: {
            charset: ":/\\?#[]{}@$&+ ,;=%<>",
            nonAscii: true,
          },
        },
      },
    ],
  }));
};

export const createAutomateSessionTool = tool({
  description: `Create a new Automate session with placeholders and payloads. Use ${MARKER} to wrap the placeholder values.`,
  inputSchema: InputSchema,
  execute: async (
    { rawRequest, host, port, isTls, strategy, concurrency, payloads },
    { experimental_context },
  ) => {
    const { sdk } = experimental_context as FloatToolContext;
    try {
      const { sanitized, placeholders } = extractPlaceholders(rawRequest);

      const raw = sanitized.replace(/\r?\n/g, "\r\n");

      const createResult = await sdk.graphql.createAutomateSession({
        input: {
          requestSource: {
            raw: {
              raw,
              connectionInfo: {
                host,
                port,
                isTLS: isTls,
              },
            },
          },
        },
      });

      const session = createResult.createAutomateSession.session!;

      const graphPayloads = attachDefaultPreprocessors(
        (payloads ?? []).map(toGraphQLPayload),
      );

      await sdk.graphql.updateAutomateSession({
        id: session.id,
        input: {
          connection: {
            host: session.connection.host,
            port: session.connection.port,
            isTLS: session.connection.isTLS,
          },
          raw: session.raw,
          settings: {
            ...session.settings,
            strategy: strategy ?? "ALL",
            concurrency: concurrency ?? { delay: 0, workers: 10 },
            payloads: graphPayloads,
            placeholders,
          },
        },
      });

      sdk.navigation.goTo("/automate");
      return actionSuccess("Automate session created");
    } catch (error) {
      return actionError("Failed to create automate session", error);
    }
  },
});
