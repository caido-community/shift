import {
  type ChatRequestOptions,
  type ChatTransport,
  convertToModelMessages,
  createUIMessageStream,
  type UIMessageChunk,
} from "ai";
import {
  createModelKey,
  type MessageMetadata,
  type ReasoningTime,
  type ShiftMessage,
} from "shared";

import { createShiftAgent } from "@/agent/agent";
import { applyCompactionMarker, buildSummaryMessage } from "@/agent/compaction";
import type { AgentContext } from "@/agent/context";
import { shiftAgentTools } from "@/agent/tools";
import { formatAgentError } from "@/agent/utils/errors";
import {
  findLastUserMessageId,
  normalizeLegacyToolStates,
  replaceHistoricalToolOutputsWithBlobRefs,
  stripReasoningParts,
} from "@/agent/utils/messages";
import { useSettingsStore } from "@/stores/settings/store";
import {
  assertDaybreakSupported,
  isProviderConfigured,
  ProviderNotConfiguredError,
} from "@/utils/ai";
import { getSessionContent } from "@/utils/caido";

export class LocalChatTransport implements ChatTransport<ShiftMessage> {
  private context: AgentContext;

  constructor(context: AgentContext) {
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
    const { sdk, store } = this.context;
    const model = store.model;
    if (!model) {
      throw new Error("No model configured for this session");
    }

    if (!isProviderConfigured(sdk, model.provider)) {
      throw new ProviderNotConfiguredError(model.provider);
    }
    assertDaybreakSupported(sdk, model, useSettingsStore().config.daybreak);

    const stream = createUIMessageStream<ShiftMessage>({
      originalMessages: options.messages,
      execute: async ({ writer }) => {
        this.context.writer = writer;
        try {
          const contentResult = await getSessionContent(sdk, this.context.sessionId);
          if (contentResult.kind === "Error") {
            console.error("Failed to get session content: ", contentResult.error);
            throw new Error(contentResult.error);
          }
          store.setHttpRequest(contentResult.value);

          const lastUserMessageId = findLastUserMessageId(options.messages);
          if (lastUserMessageId !== undefined) {
            store.createSnapshot(lastUserMessageId);
          }

          const settingsStore = useSettingsStore();
          const agent = createShiftAgent({
            sdk,
            model,
            context: this.context,
            messages: options.messages,
            maxIterations: settingsStore.config.maxIterations,
            reasoningEffort: store.reasoningEffort,
            ...settingsStore.getRequestOptions(model),
            abortSignal: options.abortSignal,
          });

          const modelKey = createModelKey(model.provider, model.id);
          const compacted = applyCompactionMarker(options.messages);
          const messagesForModel = stripReasoningParts(
            normalizeLegacyToolStates(compacted.messages),
            (message) => message.metadata?.model === modelKey
          );
          // History may hold calls to tools that are disabled now.
          const modelMessages = replaceHistoricalToolOutputsWithBlobRefs(
            await convertToModelMessages(messagesForModel, {
              tools: shiftAgentTools,
              ignoreIncompleteToolCalls: true,
            }),
            (content, id) => this.context.registerHistoricalToolOutput(id, content)
          );
          if (compacted.summary !== undefined) {
            modelMessages.unshift(buildSummaryMessage(compacted.summary));
          }

          const result = await agent.stream({
            messages: modelMessages,
            abortSignal: options.abortSignal,
          });

          let reasoningTimes: ReasoningTime[] = [];
          let isTerminalState = false;
          // Summed over the run: a single step's cache rate swings with the size of its tool result.
          const usage: NonNullable<MessageMetadata["usage"]> = {};

          writer.merge(
            result.toUIMessageStream<ShiftMessage>({
              sendStart: false,
              sendReasoning: true,
              onError: formatAgentError,
              messageMetadata: ({ part }): MessageMetadata | undefined => {
                switch (part.type) {
                  case "start-step":
                    if (isTerminalState) return undefined;
                    return { state: "streaming", reasoning_times: reasoningTimes, model: modelKey };

                  case "finish-step": {
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

                  case "finish":
                    if (isTerminalState) return undefined;
                    isTerminalState = true;
                    return {
                      state: "done",
                      reasoning_times: reasoningTimes,
                      stepLimitReached: part.finishReason === "tool-calls",
                    };

                  case "abort":
                    isTerminalState = true;
                    return { state: "aborted", reasoning_times: reasoningTimes };

                  case "reasoning-start":
                    reasoningTimes = [...reasoningTimes, { start: Date.now() }];
                    return { reasoning_times: reasoningTimes };

                  case "reasoning-end": {
                    const last = reasoningTimes.at(-1);
                    if (last) {
                      reasoningTimes = [
                        ...reasoningTimes.slice(0, -1),
                        { ...last, end: Date.now() },
                      ];
                    }
                    return { reasoning_times: reasoningTimes };
                  }

                  default:
                    return undefined;
                }
              },
            })
          );

          await result.consumeStream();
        } finally {
          // A newer run may already own the writer when an aborted one finishes late.
          if (this.context.writer === writer) this.context.writer = undefined;
        }
      },
      onError: (error) => {
        console.error("Error: ", error);
        return formatAgentError(error);
      },
    });

    return Promise.resolve(stream);
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
