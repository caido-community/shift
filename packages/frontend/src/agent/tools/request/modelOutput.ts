import type { FrontendError } from "@/agent/types";

type MessageValue = { message: string };

type RequestToolOutput<T extends MessageValue> =
  | { kind: "Ok"; value: T }
  | { kind: "Error"; error: FrontendError };

type TextModelOutput = { type: "text"; value: string };

type CreateRequestModelOutputOptions<T extends MessageValue> = {
  errorPrefix: string;
  formatValue?: (value: T) => string;
};

const toTextModelOutput = (value: string): TextModelOutput => ({
  type: "text",
  value,
});

const formatErrorText = (prefix: string, error: FrontendError): string => {
  if (error.detail !== undefined && error.detail !== "") {
    return `${prefix}: ${error.message}\n${error.detail}`;
  }

  return `${prefix}: ${error.message}`;
};

export function createRequestModelOutput<T extends MessageValue>(
  options: CreateRequestModelOutputOptions<T>
) {
  return ({ output }: { output: RequestToolOutput<T> }): TextModelOutput => {
    switch (output.kind) {
      case "Ok":
        return toTextModelOutput(options.formatValue?.(output.value) ?? output.value.message);
      case "Error":
        return toTextModelOutput(formatErrorText(options.errorPrefix, output.error));
      default:
        return toTextModelOutput("Unknown error");
    }
  };
}

export function formatRequestRangeReadModelOutput(value: {
  message: string;
  content: string;
  offset: number;
  endOffset: number;
  requestLength: number;
  hasMore: boolean;
}): string {
  return `${value.message}\nRange: [${value.offset}:${value.endOffset}] of ${value.requestLength}\nMore available: ${value.hasMore ? "yes" : "no"}\n\n${value.content}`;
}
