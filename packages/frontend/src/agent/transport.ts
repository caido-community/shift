import {
  type ChatRequestOptions,
  type ChatTransport,
  convertToModelMessages,
  createUIMessageStream,
  type UIMessageChunk,
} from "ai";
import {
  createModelKey,
  DEFAULT_MAX_ITERATIONS,
  type MessageMetadata,
  type ReasoningTime,
  type ShiftMessage,
} from "shared";

import type { FrontendSDK } from "../types";

import { createShiftAgent } from "@/agent/agent";
import { applyCompactionMarker, buildSummaryMessage } from "@/agent/compaction";
import type { AgentContext } from "@/agent/context";
import { isAITraceEnabled, writeAITrace } from "@/agent/trace";
import { formatAgentError } from "@/agent/utils/errors";
import {
  findLastUserMessageId,
  replaceHistoricalToolOutputsWithBlobRefs,
  stripReasoningParts,
  stripUnfinishedToolCalls,
} from "@/agent/utils/messages";
import { type SessionStore } from "@/stores/agent/session";
import { useSettingsStore } from "@/stores/settings/store";
import {
  assertDaybreakSupported,
  isProviderConfigured,
  ProviderNotConfiguredError,
} from "@/utils/ai";
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
    assertDaybreakSupported(this.sdk, model, useSettingsStore().daybreak);

    const traceEnabled = isAITraceEnabled();
    const traceRunId = crypto.randomUUID();
    writeAITrace(traceEnabled, traceRunId, "transport", {
      chatId: options.chatId,
      messageId: options.messageId,
      trigger: options.trigger,
      model: {
        provider: model.provider,
        id: model.id,
      },
    });
    writeAITrace(traceEnabled, traceRunId, "transport.input", options.messages);

    const context = this.context;

    const stream = createUIMessageStream<ShiftMessage>({
      originalMessages: options.messages,
      execute: async ({ writer }) => {
        context.setWriter(writer);

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
        const maxIterations = settingsStore.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        const openRouterPrioritizeFastProviders =
          settingsStore.openRouterPrioritizeFastProviders ?? false;
        const agent = createShiftAgent({
          sdk: this.sdk,
          model: model,
          context: context,
          maxIterations,
          reasoningEffort: this.store.reasoningEffort,
          openRouterPrioritizeFastProviders,
          legacyTodos: settingsStore.isFeatureEnabled("legacyTodos"),
          ...settingsStore.getRequestOptions(model),
          ...(traceEnabled ? { traceRunId } : {}),
          abortSignal: options.abortSignal,
        });

        const modelKey = createModelKey(model.provider, model.id);
        const compacted = applyCompactionMarker(options.messages);
        const stripped = stripReasoningParts(
          stripUnfinishedToolCalls(compacted.messages),
          (message) => message.metadata?.model === modelKey
        );
        let messagesForModel = stripped;
        try {
          messagesForModel = replaceHistoricalToolOutputsWithBlobRefs(stripped, (content, id) =>
            context.registerHistoricalToolOutput(id, content)
          );
        } catch (err) {
          console.warn("Historical tool output blob replacement failed, using full messages:", err);
        }
        writeAITrace(traceEnabled, traceRunId, "convertToModelMessages.input", messagesForModel);
        const modelMessages = await convertToModelMessages(messagesForModel, {
          ignoreIncompleteToolCalls: true,
        });
        if (compacted.summary !== undefined) {
          modelMessages.unshift(buildSummaryMessage(compacted.summary));
        }
        writeAITrace(traceEnabled, traceRunId, "convertToModelMessages.output", modelMessages);

        const result = await agent.stream({
          messages: modelMessages,
          abortSignal: options.abortSignal,
        });

        const reasoningTimes: ReasoningTime[] = [];
        let isTerminalState = false;
        // Summed over the run: a single step's cache rate swings with the size of its tool result.
        const usage: NonNullable<MessageMetadata["usage"]> = {};

        writer.merge(
          result.toUIMessageStream<ShiftMessage>({
            sendStart: false,
            sendReasoning: true,
            onFinish: () => {
              context.clearTodos();
            },
            onError: (error) => {
              context.clearTodos();
              writer.write({
                type: "message-metadata",
                messageMetadata: {
                  state: "error",
                  reasoning_times: [...reasoningTimes],
                },
              });
              return formatAgentError(error);
            },
            messageMetadata: ({ part }) => {
              if (part.type === "start-step") {
                if (isTerminalState) return;
                return {
                  state: "streaming",
                  reasoning_times: [...reasoningTimes],
                  model: modelKey,
                };
              }

              if (part.type === "finish-step") {
                const { inputTokens, inputTokenDetails } = part.usage;
                if (inputTokens !== undefined) {
                  usage.inputTokens = (usage.inputTokens ?? 0) + inputTokens;
                }
                if (inputTokenDetails.cacheReadTokens !== undefined) {
                  usage.cacheReadTokens =
                    (usage.cacheReadTokens ?? 0) + inputTokenDetails.cacheReadTokens;
                }
                return { usage: { ...usage } };
              }

              if (part.type === "finish") {
                if (isTerminalState) return;
                isTerminalState = true;
                return {
                  state: "done",
                  reasoning_times: [...reasoningTimes],
                  stepLimitReached: part.finishReason === "tool-calls",
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

        await result.consumeStream();
      },
      onError: (error) => {
        console.error("Error: ", error);
        return formatAgentError(error);
      },
    });

    let chunkSequence = 0;
    const loggingTransform = new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        writeAITrace(traceEnabled, traceRunId, `uiMessageChunk.${chunkSequence}`, chunk);
        chunkSequence += 1;
        controller.enqueue(chunk);
      },
      flush() {
        writeAITrace(traceEnabled, traceRunId, "uiMessageChunk.end", {
          count: chunkSequence,
        });
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
