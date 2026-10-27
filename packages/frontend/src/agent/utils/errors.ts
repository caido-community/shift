import { APICallError, getErrorMessage } from "@ai-sdk/provider";
import { type AIError } from "@caido/sdk-frontend";
import { RetryError } from "ai";

const getProviderError = (error: unknown) => {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  if (!APICallError.isInstance(cause) || typeof cause.data !== "object" || cause.data === null) {
    return undefined;
  }
  return (cause.data as AIError).providerError;
};

export const formatAgentError = (error: unknown): string => {
  const providerError = getProviderError(error);
  if (providerError?.kind === "truncated-stream") {
    const requestId =
      providerError.requestId !== undefined && providerError.requestId !== ""
        ? ` Request ID: ${providerError.requestId}`
        : "";
    return `The provider interrupted this response before reporting a final status. A provider safeguard or connection interruption may have stopped it. Some actions may already have run, so review the session before retrying.${requestId}`;
  }

  return getErrorMessage(error);
};
