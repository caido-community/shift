import { useClipboard } from "@vueuse/core";
import { computed } from "vue";

import { useSession } from "../useSession";

import { useSDK } from "@/plugins/sdk";

const ERROR_MESSAGES: Record<string, string> = {
  "User not found.":
    "Your OpenRouter API key is probably invalid, please go to Caido settings and double check it.",
};

export function useError(error: Error) {
  const session = useSession();
  const sdk = useSDK();
  const { copy } = useClipboard();
  const modelInfo = computed(() => {
    const model = session.model;
    if (!model) {
      return { id: "unknown", provider: "unknown" };
    }
    return { id: model.id, provider: model.provider };
  });

  const message = computed(() => {
    const raw = error.message ?? String(error);
    const mapped = ERROR_MESSAGES[raw] ?? raw;
    return mapped.replace(/\\n/g, "\n");
  });

  async function retry() {
    session.chat.clearError();
    await session.chat.regenerate();
  }

  function copyTrace() {
    const trace = [
      "Here's the error trace for debugging purposes. Please redact sensitive information before sharing this.",
      "=== Shift Error Trace ===",
      `Session ID: ${session.id}`,
      `Model: ${modelInfo.value.id}`,
      `Provider: ${modelInfo.value.provider}`,
      `Chat.Status: ${session.chat.status}`,
      "",
      "=== Error ===",
      `Name: ${error.name}`,
      `Message: ${error.message}`,
      "",
      "=== Stack Trace ===",
      error.stack ?? "No stack trace available",
      "",
      "=== Messages ===",
      JSON.stringify(session.chat.messages, undefined, 2),
    ].join("\n");

    copy(trace);

    sdk.window.showToast("Trace copied to clipboard", {
      variant: "success",
    });
  }

  return { message, retry, copyTrace };
}
