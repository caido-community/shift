import {
  type AutomatePayloadInput,
  type AutomatePayloadOptionsInput,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import { z } from "zod";

import { type ActionDefinition } from "@/float/types";
import { type FrontendSDK } from "@/types";

// TODO: entire thing is broken, need to fix it
const MARKER = "§§§";

const concurrencySchema = z.object({
  delay: z.number().int().min(0).describe("Delay in ms between requests"),
  workers: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Parallel workers (1-100)"),
});

const numbersPayloadSchema = z.object({
  kind: z.literal("Numbers"),
  start: z.number().int().describe("Start of inclusive range"),
  end: z.number().int().describe("End of inclusive range"),
});

const hostedFilePayloadSchema = z.object({
  kind: z.literal("HostedFile"),
  id: z.string().min(1).describe("Hosted file ID"),
});

const listPayloadSchema = z.object({
  kind: z.literal("List"),
  list: z.array(z.string()).min(1).describe("List of strings"),
});

const payloadSchema = z.discriminatedUnion("kind", [
  numbersPayloadSchema,
  hostedFilePayloadSchema,
  listPayloadSchema,
]);

export const createAutomateSessionSchema = z.object({
  name: z.literal("createAutomateSession"),
  parameters: z.object({
    rawRequest: z
      .string()
      .min(1)
      .describe(
        "Raw HTTP request with placeholder markers '§§§start§§§' and '§§§end§§§' pairs",
      ),
    host: z.string().min(1).describe("Target host"),
    port: z.number().int().positive().describe("Target port"),
    isTls: z.boolean().default(true).describe("Whether to use TLS/SSL"),
    strategy: z.enum(["ALL", "MATRIX", "PARALLEL", "SEQUENTIAL"]),
    concurrency: concurrencySchema.describe(
      "Concurrency settings. This is optional, leave empty for default.",
    ),
    payloads: z
      .array(payloadSchema)
      .describe(
        "Array of payload definitions. This is optional, leave empty for default.",
      ),
  }),
});

export type NumbersPayload = z.infer<typeof numbersPayloadSchema>;
export type HostedFilePayload = z.infer<typeof hostedFilePayloadSchema>;
export type ListPayload = z.infer<typeof listPayloadSchema>;
export type AutomatePayload = z.infer<typeof payloadSchema>;

export type CreateAutomateSessionInput = z.infer<
  typeof createAutomateSessionSchema
>;

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

export const createAutomateSession: ActionDefinition<CreateAutomateSessionInput> =
  {
    name: "createAutomateSession",
    description: `Create a new Automate session with placeholders and payloads. Use ${MARKER} to wrap the placeholder values.`,
    inputSchema: createAutomateSessionSchema,
    execute: async (
      sdk: FrontendSDK,
      {
        rawRequest,
        host,
        port,
        isTls,
        strategy,
        concurrency,
        payloads,
      }: CreateAutomateSessionInput["parameters"],
    ) => {
      try {
        const { sanitized, placeholders } = extractPlaceholders(rawRequest);

        // ensure CRLF
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
        return {
          success: true,
          frontend_message: "Automate session created",
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to create automate session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        };
      }
    },
  };
