import { APICallError, getErrorMessage } from "@ai-sdk/provider";

type TruncatedStreamDetails = {
  kind: "truncated-stream";
  requestId?: unknown;
};

const isTruncatedStreamDetails = (value: unknown): value is TruncatedStreamDetails => {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "truncated-stream"
  );
};

export const formatAgentError = (error: unknown): string => {
  if (APICallError.isInstance(error) && isTruncatedStreamDetails(error.data)) {
    const requestId =
      typeof error.data.requestId === "string" && error.data.requestId.length > 0
        ? ` Request ID: ${error.data.requestId}`
        : "";
    return `The provider interrupted this response before reporting a final status. A provider safeguard or connection interruption may have stopped it. Some actions may already have run, so review the session before retrying.${requestId}`;
  }

  return getErrorMessage(error);
};
