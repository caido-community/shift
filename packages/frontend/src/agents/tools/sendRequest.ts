import { tool } from "ai";
import { z } from "zod";

import { type ToolContext } from "@/agents/types";

const formatTruncatedResponse = (rawResponse: string, responseID: string) => {
  const maxResponseLength = 5000;
  if (rawResponse.length <= maxResponseLength) {
    return rawResponse;
  }

  const totalLength = rawResponse.length;
  const remainingLength = totalLength - maxResponseLength;
  return (
    rawResponse.slice(0, maxResponseLength) +
    `[...] (truncated after ${maxResponseLength} bytes. ${remainingLength} bytes remaining. If you need to read more, use the responseID '${responseID}' with grepResponse tool to read the next ${maxResponseLength} byte chunk. Only do this if the content you're looking for wasn't found in this chunk. The full response is ${totalLength} bytes.)`
  );
};

export const sendRequestTool = tool({
  description:
    "Send the current HTTP request for this replay session. Returns JSON object with the following fields: rawResponse, roundtripTime, responseID. Use responseID if needed to search through the full response using grepResponse tool.",
  inputSchema: z.object({}),
  execute: async (_input, { experimental_context }) => {
    const context = experimental_context as ToolContext;
    const { sdk, replaySession } = context;

    await sdk.replay.sendRequest(replaySession.id, {
      connectionInfo: {
        host: replaySession.request.host,
        isTLS: replaySession.request.isTLS,
        port: replaySession.request.port,
      },
      raw: replaySession.request.raw,
      background: true,
    });

    try {
      let responseID: string | undefined = undefined;
      const iterator = sdk.graphql.updatedReplaySession({});

      const timeout = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timeout after 30 seconds")),
          30000,
        );
      });

      const responsePromise = (async () => {
        for await (const event of iterator) {
          if (
            event.updatedReplaySession.sessionEdge.node.id === replaySession.id
          ) {
            responseID =
              event.updatedReplaySession.sessionEdge.node.activeEntry?.request
                ?.response?.id;
            break;
          }
        }
      })();

      await Promise.race([responsePromise, timeout]);

      if (responseID === undefined) {
        throw new Error("No response received");
      }

      const result = await sdk.graphql.response({
        id: responseID,
      });

      if (result.response === undefined || result.response === null) {
        throw new Error("Failed to retrieve response");
      }

      return {
        rawResponse: formatTruncatedResponse(result.response.raw, responseID),
        roundtripTime: result.response.roundtripTime,
        responseID,
      };
    } catch (error) {
      return {
        error: "Error while sending request: " + (error as Error).message,
      };
    }
  },
});
