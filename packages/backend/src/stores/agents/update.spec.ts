import type { ShiftMessage } from "shared";
import { describe, expect, it } from "vitest";

import { type AgentsModel, createInitialModel } from "./model";
import { update } from "./update";

const createMockMessage = (): ShiftMessage =>
  ({
    id: `msg-${Date.now()}`,
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  }) as ShiftMessage;

describe("agents update", () => {
  describe("WRITE_AGENT", () => {
    it("adds a new agent when chatID does not exist", () => {
      const model = createInitialModel();
      const messages = [createMockMessage()];
      const updatedAt = Date.now();

      const result = update(model, {
        type: "WRITE_AGENT",
        chatID: "chat-1",
        messages,
        updatedAt,
        sessionState: undefined,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.chatID).toBe("chat-1");
      expect(result[0]?.messages).toBe(messages);
      expect(result[0]?.updatedAt).toBe(updatedAt);
    });

    it("updates existing agent when chatID exists", () => {
      const initialMessages = [createMockMessage()];
      const model: AgentsModel = [{ chatID: "chat-1", messages: initialMessages, updatedAt: 1000 }];
      const newMessages = [createMockMessage()];
      const newUpdatedAt = 2000;

      const result = update(model, {
        type: "WRITE_AGENT",
        chatID: "chat-1",
        messages: newMessages,
        updatedAt: newUpdatedAt,
        sessionState: undefined,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.chatID).toBe("chat-1");
      expect(result[0]?.messages).toBe(newMessages);
      expect(result[0]?.updatedAt).toBe(newUpdatedAt);
    });

    it("preserves other agents when updating one", () => {
      const model: AgentsModel = [
        { chatID: "chat-1", messages: [createMockMessage()], updatedAt: 1000 },
        { chatID: "chat-2", messages: [createMockMessage()], updatedAt: 1000 },
      ];
      const newMessages = [createMockMessage()];

      const result = update(model, {
        type: "WRITE_AGENT",
        chatID: "chat-1",
        messages: newMessages,
        updatedAt: 2000,
        sessionState: undefined,
      });

      expect(result).toHaveLength(2);
      expect(result[0]?.messages).toBe(newMessages);
      expect(result[1]?.chatID).toBe("chat-2");
    });

    it("creates a new array reference", () => {
      const model: AgentsModel = [];

      const result = update(model, {
        type: "WRITE_AGENT",
        chatID: "chat-1",
        messages: [],
        updatedAt: Date.now(),
        sessionState: undefined,
      });

      expect(result).not.toBe(model);
    });
  });

  describe("REMOVE_AGENT", () => {
    it("removes an agent by chatID", () => {
      const model: AgentsModel = [
        { chatID: "chat-1", messages: [], updatedAt: 1000 },
        { chatID: "chat-2", messages: [], updatedAt: 1000 },
      ];

      const result = update(model, {
        type: "REMOVE_AGENT",
        chatID: "chat-1",
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.chatID).toBe("chat-2");
    });

    it("returns unchanged model when chatID does not exist", () => {
      const model: AgentsModel = [{ chatID: "chat-1", messages: [], updatedAt: 1000 }];

      const result = update(model, {
        type: "REMOVE_AGENT",
        chatID: "chat-nonexistent",
      });

      expect(result).toHaveLength(1);
    });

    it("returns empty array when removing the only agent", () => {
      const model: AgentsModel = [{ chatID: "chat-1", messages: [], updatedAt: 1000 }];

      const result = update(model, {
        type: "REMOVE_AGENT",
        chatID: "chat-1",
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("CLEANUP_OLD_AGENTS", () => {
    it("removes agents older than maxAge", () => {
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const threeWeeksAgo = now - 21 * 24 * 60 * 60 * 1000;

      const model: AgentsModel = [
        { chatID: "recent", messages: [], updatedAt: oneWeekAgo },
        { chatID: "old", messages: [], updatedAt: threeWeeksAgo },
      ];

      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
      const result = update(model, {
        type: "CLEANUP_OLD_AGENTS",
        maxAge: twoWeeksMs,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.chatID).toBe("recent");
    });

    it("keeps all agents when none are old", () => {
      const now = Date.now();
      const model: AgentsModel = [
        { chatID: "chat-1", messages: [], updatedAt: now },
        { chatID: "chat-2", messages: [], updatedAt: now - 1000 },
      ];

      const result = update(model, {
        type: "CLEANUP_OLD_AGENTS",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      expect(result).toHaveLength(2);
    });

    it("removes all agents when all are old", () => {
      const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const model: AgentsModel = [
        { chatID: "chat-1", messages: [], updatedAt: oldTime },
        { chatID: "chat-2", messages: [], updatedAt: oldTime },
      ];

      const result = update(model, {
        type: "CLEANUP_OLD_AGENTS",
        maxAge: 14 * 24 * 60 * 60 * 1000,
      });

      expect(result).toHaveLength(0);
    });
  });

  describe("unknown message type", () => {
    it("returns the model unchanged", () => {
      const model = createInitialModel();

      const result = update(model, { type: "UNKNOWN" } as never);

      expect(result).toBe(model);
    });
  });

  describe("createInitialModel", () => {
    it("creates empty array", () => {
      const model = createInitialModel();

      expect(model).toEqual([]);
    });
  });
});
