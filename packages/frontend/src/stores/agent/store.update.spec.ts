import { describe, expect, it } from "vitest";

import { type AgentModel, createInitialModel } from "./store.model";
import { update } from "./store.update";

const createMockSession = (id: string) =>
  ({ id }) as AgentModel["sessions"] extends Map<string, infer T> ? T : never;

describe("agent update", () => {
  describe("SELECT_SESSION", () => {
    it("sets the selected session id", () => {
      const model = createInitialModel();

      const result = update(model, { type: "SELECT_SESSION", sessionId: "session-1" });

      expect(result.selectedSessionId).toBe("session-1");
    });

    it("can set selected session id to undefined", () => {
      const model: AgentModel = {
        ...createInitialModel(),
        selectedSessionId: "session-1",
      };

      const result = update(model, { type: "CLEAR_SESSION_SELECTION" });

      expect(result.selectedSessionId).toBeUndefined();
    });

    it("does not modify other state", () => {
      const model: AgentModel = {
        ...createInitialModel(),
        debugMode: true,
      };

      const result = update(model, { type: "SELECT_SESSION", sessionId: "session-1" });

      expect(result.debugMode).toBe(true);
      expect(result.sessions).toEqual(model.sessions);
    });
  });

  describe("TOGGLE_DEBUG_MODE", () => {
    it("toggles debug mode from false to true", () => {
      const model = createInitialModel();

      const result = update(model, { type: "TOGGLE_DEBUG_MODE" });

      expect(result.debugMode).toBe(true);
    });

    it("toggles debug mode from true to false", () => {
      const model: AgentModel = {
        ...createInitialModel(),
        debugMode: true,
      };

      const result = update(model, { type: "TOGGLE_DEBUG_MODE" });

      expect(result.debugMode).toBe(false);
    });

    it("does not modify other state", () => {
      const model: AgentModel = {
        ...createInitialModel(),
        selectedSessionId: "session-1",
      };

      const result = update(model, { type: "TOGGLE_DEBUG_MODE" });

      expect(result.selectedSessionId).toBe("session-1");
      expect(result.sessions).toEqual(model.sessions);
    });
  });

  describe("ADD_SESSION", () => {
    it("adds a new session to the map", () => {
      const model = createInitialModel();
      const session = createMockSession("session-1");

      const result = update(model, {
        type: "ADD_SESSION",
        sessionId: "session-1",
        session,
      });

      expect(result.sessions.size).toBe(1);
      expect(result.sessions.get("session-1")).toBe(session);
    });

    it("can add multiple sessions", () => {
      const model = createInitialModel();
      const session1 = createMockSession("session-1");
      const session2 = createMockSession("session-2");

      const result1 = update(model, {
        type: "ADD_SESSION",
        sessionId: "session-1",
        session: session1,
      });
      const result2 = update(result1, {
        type: "ADD_SESSION",
        sessionId: "session-2",
        session: session2,
      });

      expect(result2.sessions.size).toBe(2);
      expect(result2.sessions.get("session-1")).toBe(session1);
      expect(result2.sessions.get("session-2")).toBe(session2);
    });

    it("creates a new Map instance", () => {
      const model = createInitialModel();
      const session = createMockSession("session-1");

      const result = update(model, {
        type: "ADD_SESSION",
        sessionId: "session-1",
        session,
      });

      expect(result.sessions).not.toBe(model.sessions);
    });

    it("does not modify other state", () => {
      const model: AgentModel = {
        ...createInitialModel(),
        selectedSessionId: "other",
        debugMode: true,
      };
      const session = createMockSession("session-1");

      const result = update(model, {
        type: "ADD_SESSION",
        sessionId: "session-1",
        session,
      });

      expect(result.selectedSessionId).toBe("other");
      expect(result.debugMode).toBe(true);
    });
  });

  describe("REMOVE_SESSION", () => {
    it("removes an existing session from the map", () => {
      const session = createMockSession("session-1");
      const sessions = new Map([["session-1", session]]);
      const model: AgentModel = {
        ...createInitialModel(),
        sessions,
      };

      const result = update(model, { type: "REMOVE_SESSION", sessionId: "session-1" });

      expect(result.sessions.size).toBe(0);
      expect(result.sessions.has("session-1")).toBe(false);
    });

    it("does nothing when session does not exist", () => {
      const model = createInitialModel();

      const result = update(model, { type: "REMOVE_SESSION", sessionId: "nonexistent" });

      expect(result.sessions.size).toBe(0);
    });

    it("creates a new Map instance", () => {
      const session = createMockSession("session-1");
      const sessions = new Map([["session-1", session]]);
      const model: AgentModel = {
        ...createInitialModel(),
        sessions,
      };

      const result = update(model, { type: "REMOVE_SESSION", sessionId: "session-1" });

      expect(result.sessions).not.toBe(model.sessions);
    });

    it("preserves other sessions", () => {
      const session1 = createMockSession("session-1");
      const session2 = createMockSession("session-2");
      const sessions = new Map([
        ["session-1", session1],
        ["session-2", session2],
      ]);
      const model: AgentModel = {
        ...createInitialModel(),
        sessions,
      };

      const result = update(model, { type: "REMOVE_SESSION", sessionId: "session-1" });

      expect(result.sessions.size).toBe(1);
      expect(result.sessions.get("session-2")).toBe(session2);
    });

    it("does not modify other state", () => {
      const session = createMockSession("session-1");
      const sessions = new Map([["session-1", session]]);
      const model: AgentModel = {
        ...createInitialModel(),
        sessions,
        selectedSessionId: "session-1",
        debugMode: true,
      };

      const result = update(model, { type: "REMOVE_SESSION", sessionId: "session-1" });

      expect(result.selectedSessionId).toBe("session-1");
      expect(result.debugMode).toBe(true);
    });
  });

  describe("unknown message type", () => {
    it("returns the model unchanged", () => {
      const model = createInitialModel();

      const result = update(model, { type: "UNKNOWN" } as never);

      expect(result).toBe(model);
    });
  });
});
