import type { ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import { AgentSession } from "./session";

const createSession = (
  status: "ready" | "streaming" | "error",
  messages: ShiftMessage[],
  error?: Error
) => {
  const session: AgentSession = Object.create(AgentSession.prototype);
  Object.defineProperty(session, "chat", {
    value: { status, messages, error },
  });
  return session;
};

describe("AgentSession", () => {
  it("keeps the generating state visible until the first displayable assistant part", () => {
    const userMessage = {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Inspect this" }],
    } as ShiftMessage;
    const pendingAssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      parts: [{ type: "step-start" }],
    } as ShiftMessage;
    const reasoningAssistantMessage = {
      id: "assistant-1",
      role: "assistant",
      parts: [{ type: "reasoning", text: "Checking", state: "streaming" }],
    } as ShiftMessage;

    expect(createSession("streaming", [userMessage]).isWaitingForFirstToken()).toBe(true);
    expect(
      createSession("streaming", [userMessage, pendingAssistantMessage]).isWaitingForFirstToken()
    ).toBe(true);
    expect(
      createSession("streaming", [userMessage, reasoningAssistantMessage]).isWaitingForFirstToken()
    ).toBe(false);
    expect(createSession("ready", [userMessage]).isWaitingForFirstToken()).toBe(false);
  });

  it("exposes the stream error for the chat UI", () => {
    const session = createSession("error", [], new Error("Provider request failed"));

    expect(session.errorMessage()).toBe("Provider request failed");
  });
});
