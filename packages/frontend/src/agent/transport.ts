import {
  type ChatRequestOptions,
  type ChatTransport,
  convertToModelMessages,
  createUIMessageStream,
  type UIMessageChunk,
} from "ai";
import { type ReasoningTime, type ShiftMessage } from "shared";

import type { FrontendSDK } from "../types";

import { createShiftAgent } from "@/agent/agent";
import type { AgentContext } from "@/agent/context";
import {
  findLastUserMessageId,
  stripReasoningParts,
  stripUnfinishedToolCalls,
} from "@/agent/utils/messages";
import { type SessionStore } from "@/stores/agent/session";
import { useSettingsStore } from "@/stores/settings/store";
import { isProviderConfigured, ProviderNotConfiguredError } from "@/utils/ai";
import { getSessionContent } from "@/utils/caido";

export class LocalChatTransport implements ChatTransport<ShiftMessage> {
  private sdk: FrontendSDK;
  private store: SessionStore;
  private context: AgentContext;

  constructor(sdk: FrontendSDK, store: SessionStore, context: AgentContext) {
    this.sdk = sdk;
    this.store = store;
    this.context = context;
  }

  sendMessages(
    options: {
      chatId: string;
      messages: ShiftMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions
  ): Promise<ReadableStream<UIMessageChunk>> {
    const model = this.store.model;
    if (!model) {
      throw new Error("No model configured for this session");
    }

    if (!isProviderConfigured(this.sdk, model.provider)) {
      throw new ProviderNotConfiguredError(model.provider);
    }

    const context = this.context;

    const stream = createUIMessageStream<ShiftMessage>({
      originalMessages: options.messages,
      execute: async ({ writer }) => {
        context.setWriter(writer);
        context.clearPayloadBlobs();

        const [contentResult] = await Promise.all([
          getSessionContent(this.sdk, context.sessionId),
          context.fetchEnvironmentInfo(),
          context.fetchEntriesInfo(),
        ]);
        if (contentResult.kind === "Error") {
          console.error("Failed to get session content: ", contentResult.error);
          throw new Error(contentResult.error);
        }
        context.setHttpRequest(contentResult.value);

        const lastUserMessageId = findLastUserMessageId(options.messages);
        if (lastUserMessageId !== undefined) {
          this.store.createSnapshot(lastUserMessageId);
        }

        const settingsStore = useSettingsStore();
        const maxIterations = settingsStore.maxIterations ?? 35;
        const openRouterPrioritizeFastProviders =
          settingsStore.openRouterPrioritizeFastProviders ?? false;
        const agent = createShiftAgent({
          sdk: this.sdk,
          model: model,
          context: context,
          maxIterations,
          reasoningEffort: this.store.reasoningEffort,
          openRouterPrioritizeFastProviders,
        });

        const sanitizedMessages = stripReasoningParts(stripUnfinishedToolCalls(options.messages));
        const modelMessages = await convertToModelMessages(sanitizedMessages);

        const result = await agent.stream({
          messages: modelMessages,
          abortSignal: options.abortSignal,
        });

        const reasoningTimes: ReasoningTime[] = [];
        let isTerminalState = false;

        writer.merge(
          result.toUIMessageStream<ShiftMessage>({
            sendStart: false,
            sendReasoning: true,
            onFinish: () => {
              context.clearTodos();
              context.clearPayloadBlobs();
            },
            onError: (error) => {
              context.clearTodos();
              context.clearPayloadBlobs();
              writer.write({
                type: "message-metadata",
                messageMetadata: {
                  state: "error",
                  reasoning_times: [...reasoningTimes],
                },
              });
              return (error as Error).message;
            },
            messageMetadata: ({ part }) => {
              if (part.type === "start-step") {
                if (isTerminalState) return;
                return {
                  state: "streaming",
                  reasoning_times: [...reasoningTimes],
                };
              }

              if (part.type === "finish") {
                if (isTerminalState) return;
                isTerminalState = true;
                return {
                  state: "done",
                  reasoning_times: [...reasoningTimes],
                };
              }

              if (part.type === "error") {
                isTerminalState = true;
                return {
                  state: "error",
                  reasoning_times: [...reasoningTimes],
                };
              }

              if (part.type === "tool-error") {
                isTerminalState = true;
                return {
                  state: "error",
                  reasoning_times: [...reasoningTimes],
                };
              }

              if (part.type === "abort") {
                isTerminalState = true;
                return {
                  state: "aborted",
                  reasoning_times: [...reasoningTimes],
                };
              }

              if (part.type === "reasoning-start") {
                reasoningTimes.push({ start: Date.now() });
                return {
                  reasoning_times: [...reasoningTimes],
                };
              }

              if (part.type === "reasoning-end") {
                const last = reasoningTimes[reasoningTimes.length - 1];
                if (last) last.end = Date.now();
                return {
                  reasoning_times: [...reasoningTimes],
                };
              }
            },
          })
        );

        try {
          await result.consumeStream();
        } finally {
          context.clearPayloadBlobs();
        }
      },
      onError: (error) => {
        this.context.clearPayloadBlobs();
        console.error("Error: ", error);
        return (error as Error).message;
      },
    });

    const loggingTransform = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
      },
    });

    return Promise.resolve(stream.pipeThrough(loggingTransform));
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async reconnectToStream(
    _options: {
      chatId: string;
    } & ChatRequestOptions
    // eslint-disable-next-line @typescript-eslint/no-restricted-types
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    // We have to use null here to match the expected return type

    return null;
  }
}
