import { Chat } from "@ai-sdk/vue";
import { type Model, type ShiftMessage } from "shared";
import { computed, type ComputedRef, effectScope, ref, watch } from "vue";

import { getAgentSetup, getToolsCharacters } from "@/agent/agent";
import { AgentContext } from "@/agent/context";
import { LocalChatTransport } from "@/agent/transport";
import { getEstimatedContextUsage } from "@/agent/utils/contextUsage";
import {
  extractLastUserMessageText,
  hasDisplayableAssistantContent,
  hasToolPartsSinceLastUserMessage,
  markUnfinishedMessages,
} from "@/agent/utils/messages";
import { createSessionStore, type SessionStore } from "@/stores/agent/session";
import { type FrontendSDK } from "@/types";

type SessionPhase = "idle" | "waiting" | "compacting" | "streaming" | "error";

export class AgentSession {
  readonly id: string;
  readonly store: SessionStore;
  readonly chat: Chat<ShiftMessage>;
  readonly context: AgentContext;
  readonly phase: ComputedRef<SessionPhase>;
  readonly loaded: Promise<void>;
  private readonly sdk: FrontendSDK;
  private readonly scope = effectScope(true);
  private readonly compacting = ref(false);
  private disposed = false;
  private isLoaded = false;

  constructor(sdk: FrontendSDK, replaySessionId: string, model: Model | undefined) {
    this.id = replaySessionId;
    this.sdk = sdk;
    this.store = createSessionStore();
    this.store.setModel(model);
    this.context = new AgentContext(sdk, replaySessionId, this.store);

    this.chat = new Chat<ShiftMessage>({
      id: replaySessionId,
      transport: new LocalChatTransport(this.context),
      onData: (part) => {
        if (part.type === "data-compacting") this.compacting.value = part.data;
      },
      onFinish: ({ isAbort, isError }) => {
        if (this.disposed) return;

        this.compacting.value = false;
        if (isAbort || isError) {
          this.chat.messages = markUnfinishedMessages(
            this.chat.messages,
            isAbort ? "aborted" : "error"
          );
        }
        this.persistMessages();

        // After a stop the caller decides whether the queue continues.
        if (!isAbort && !isError) {
          this.processNextInQueue();
        }
      },
    });

    this.phase = computed(() => {
      if (this.chat.status === "error") return "error";
      if (!this.isGenerating()) return "idle";
      if (this.compacting.value) return "compacting";

      const lastMessage = this.chat.messages.at(-1);
      return lastMessage !== undefined && hasDisplayableAssistantContent(lastMessage)
        ? "streaming"
        : "waiting";
    });

    this.loaded = this.loadPersistedMessages();
  }

  private async loadPersistedMessages(): Promise<void> {
    try {
      const result = await this.sdk.backend.getAgent(this.id);
      if (!this.disposed && result.kind === "Ok" && result.value !== undefined) {
        this.chat.messages = markUnfinishedMessages(result.value.messages, "aborted");
        if (result.value.sessionState?.mode !== undefined) {
          this.store.setMode(result.value.sessionState.mode);
        }
        if (result.value.sessionState?.selectedCustomAgentId !== undefined) {
          this.store.setCustomAgent({
            id: result.value.sessionState.selectedCustomAgentId,
            allowedWorkflowIds: undefined,
          });
        }
      }
    } catch (error) {
      console.error("Failed to load agent messages:", error);
    }

    if (this.disposed) return;
    this.isLoaded = true;
    this.scope.run(() => {
      watch([() => this.store.mode, () => this.store.selectedCustomAgentId], () =>
        this.persistMessages()
      );
    });
    this.processNextInQueue();
  }

  async persistMessages(): Promise<void> {
    if (this.disposed) return;

    const result = await this.sdk.backend.writeAgent(this.id, this.chat.messages, {
      mode: this.store.mode,
      selectedCustomAgentId: this.store.selectedCustomAgentId,
    });
    if (result.kind === "Error") {
      console.error("Failed to persist agent messages:", result.error);
    }
  }

  // Chat status stays "ready" while history loads, so queue until then to keep runs from overlapping.
  async send(text: string): Promise<void> {
    if (this.disposed) return;
    if (!this.isLoaded || this.isGenerating()) {
      this.store.addToQueue(text);
      return;
    }
    await this.chat.sendMessage({ text });
  }

  async sendFromQueue(id: string): Promise<void> {
    if (!this.store.queuedMessages.some((msg) => msg.id === id)) return;

    this.store.moveToFrontOfQueue(id);
    await this.stopAndWait();
    this.processNextInQueue();
  }

  processNextInQueue(): void {
    const next = this.store.queuedMessages[0];
    if (!next || !this.isLoaded || this.isGenerating()) return;

    this.store.removeFromQueue(next.id);
    this.send(next.text);
  }

  estimateContextUsage() {
    const { tools, instructions, skillsPrompt } = getAgentSetup(this.context);
    return getEstimatedContextUsage({
      model: this.store.model,
      systemPrompt: instructions,
      skillsPrompt,
      toolsCharacters: getToolsCharacters(tools),
      messages: this.chat.messages,
    });
  }

  isGenerating(): boolean {
    return this.chat.status === "streaming" || this.chat.status === "submitted";
  }

  async stopAndWait(): Promise<void> {
    if (!this.isGenerating()) return;

    await this.chat.stop();
    if (!this.isGenerating()) return;

    return new Promise((resolve) => {
      const unwatch = watch(
        () => this.isGenerating(),
        (generating) => {
          if (!generating) {
            unwatch();
            resolve();
          }
        }
      );
    });
  }

  async stop(): Promise<string | undefined> {
    await this.stopAndWait();

    let withdrawnText: string | undefined;
    if (!hasToolPartsSinceLastUserMessage(this.chat.messages)) {
      const result = extractLastUserMessageText(this.chat.messages);
      this.chat.messages = result.remainingMessages;
      this.persistMessages();
      withdrawnText = result.removedText;
    }

    this.processNextInQueue();
    return withdrawnText;
  }

  async clear(): Promise<void> {
    this.store.clearQueuedMessages();
    await this.stopAndWait();

    this.chat.messages = [];
    this.store.clearSnapshots();
    this.context.clearPayloadBlobs();
    this.persistMessages();
  }

  async truncateBefore(messageId: string): Promise<boolean> {
    this.store.clearQueuedMessages();
    await this.stopAndWait();

    const index = this.chat.messages.findIndex((message) => message.id === messageId);
    if (index === -1) return false;

    this.chat.messages = this.chat.messages.slice(0, index);
    this.persistMessages();
    return true;
  }

  async revertTo(messageId: string): Promise<void> {
    if (!this.store.hasSnapshot(messageId)) return;
    if (!(await this.truncateBefore(messageId))) return;

    const result = this.store.restoreSnapshot(messageId);
    if (result.kind === "Ok") {
      this.context.setHttpRequest(result.value);
    }
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.scope.stop();
    this.chat.stop();
  }
}
