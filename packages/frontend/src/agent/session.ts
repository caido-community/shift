import { Chat } from "@ai-sdk/vue";
import { type Model, type ShiftMessage } from "shared";
import { nextTick, watch } from "vue";

import { AgentContext } from "@/agent/context";
import { LocalChatTransport } from "@/agent/transport";
import {
  extractLastUserMessageText,
  hasToolPartsSinceLastUserMessage,
} from "@/agent/utils/messages";
import { useAgentStore } from "@/stores/agent";
import { type SessionStore, useSessionStore } from "@/stores/agent/session";
import { type FrontendSDK } from "@/types";

export class AgentSession {
  readonly id: string;
  readonly store: SessionStore;
  readonly chat: Chat<ShiftMessage>;
  private sdk: FrontendSDK;
  private isStopInProgress = false;
  private isInitialized = false;

  constructor(sdk: FrontendSDK, replaySessionId: string, model: Model) {
    this.id = replaySessionId;
    this.sdk = sdk;
    this.store = useSessionStore(replaySessionId);
    this.store.setModel(model);

    const context = new AgentContext(sdk, replaySessionId, this.store);
    this.chat = new Chat<ShiftMessage>({
      id: replaySessionId,
      transport: new LocalChatTransport(sdk, this.store, context),
    });

    watch(
      () => this.chat.status,
      (status, prevStatus) => {
        if (status === "ready" && prevStatus !== "ready") {
          this.persistMessages();

          if (!this.isStopInProgress) {
            this.processNextInQueue();
          }
        } else if (status === "error" && prevStatus !== "error") {
          this.persistMessages();
        }
      }
    );

    watch(
      () => [this.store.mode, this.store.selectedCustomAgentId] as const,
      ([mode, agentId], [prevMode, prevAgentId]) => {
        if (!this.isInitialized) {
          return;
        }
        if (mode === prevMode && agentId === prevAgentId) {
          return;
        }
        this.persistMessages();
      }
    );

    this.loadPersistedMessages();
  }

  private async loadPersistedMessages(): Promise<void> {
    if (this.isInitialized) return;

    const result = await this.sdk.backend.getAgent(this.id);
    if (result.kind === "Ok" && result.value !== undefined) {
      this.chat.messages = result.value.messages;
      if (result.value.sessionState?.mode !== undefined) {
        this.store.setMode(result.value.sessionState.mode);
      }
      if (result.value.sessionState?.selectedCustomAgentId !== undefined) {
        this.store.dispatch({
          type: "SET_CUSTOM_AGENT",
          agentId: result.value.sessionState.selectedCustomAgentId,
          allowedWorkflowIds: undefined,
        });
      }
    }
    this.isInitialized = true;
  }

  async persistMessages(): Promise<void> {
    const result = await this.sdk.backend.writeAgent(this.id, this.chat.messages, {
      mode: this.store.mode,
      selectedCustomAgentId: this.store.selectedCustomAgentId,
    });
    if (result.kind === "Error") {
      console.error("Failed to persist agent messages:", result.error);
      return;
    }

    const agentStore = useAgentStore();
    if (this.chat.messages.length > 0) {
      agentStore.dispatch({ type: "ADD_PERSISTED_SESSION_ID", sessionId: this.id });
    } else {
      agentStore.dispatch({ type: "REMOVE_PERSISTED_SESSION_ID", sessionId: this.id });
    }
  }

  get todos() {
    return this.store.todos;
  }

  get model() {
    return this.store.model;
  }

  set model(value: Model | undefined) {
    this.store.setModel(value);
  }

  get queuedMessages() {
    return this.store.queuedMessages;
  }

  get draftMessage() {
    return this.store.draftMessage;
  }

  set draftMessage(value: string) {
    this.store.setDraftMessage(value);
  }

  addToQueue(text: string): void {
    this.store.addToQueue(text);
  }

  removeFromQueue(id: string): void {
    this.store.removeFromQueue(id);
  }

  async sendFromQueue(id: string): Promise<void> {
    const message = this.queuedMessages.find((msg) => msg.id === id);
    if (!message) return;

    if (this.isGenerating()) {
      this.store.moveToFrontOfQueue(id);
      await this.chat.stop();
    } else {
      this.removeFromQueue(id);
      this.chat.sendMessage({ text: message.text });
    }
  }

  private processNextInQueue(): void {
    const next = this.queuedMessages[0];
    if (!next) return;

    this.removeFromQueue(next.id);
    this.chat.sendMessage({ text: next.text });
  }

  isGenerating(): boolean {
    return this.chat.status === "streaming" || this.chat.status === "submitted";
  }

  async stopAndWait(): Promise<void> {
    if (!this.isGenerating()) return;

    this.isStopInProgress = true;
    await this.chat.stop();

    if (this.chat.status === "ready" || this.chat.status === "error") return;

    return new Promise((resolve) => {
      const unwatch = watch(
        () => this.chat.status,
        (status) => {
          if (status === "ready" || status === "error") {
            unwatch();
            nextTick(resolve);
          }
        },
        { immediate: true }
      );
    });
  }

  resumeAfterStop(): void {
    this.isStopInProgress = false;
    this.processNextInQueue();
  }

  isWaitingForFirstToken(): boolean {
    return this.chat.status === "submitted";
  }

  isErrored(): boolean {
    return this.chat.status === "error";
  }

  hasExecutedToolsSinceLastUserMessage(): boolean {
    return hasToolPartsSinceLastUserMessage(this.chat.messages);
  }

  removeLastUserMessage(): string | undefined {
    const result = extractLastUserMessageText(this.chat.messages);
    this.chat.messages = result.remainingMessages;
    this.persistMessages();
    return result.removedText;
  }

  clearTodos(): void {
    this.store.clearTodos();
  }
}
