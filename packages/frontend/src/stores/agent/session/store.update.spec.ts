import { describe, expect, it } from "vitest";

import {
  createInitialModel,
  type SessionModel,
  type SessionUpdateResult,
  type SessionUpdateResultWithValue,
} from "./store.model";
import { update } from "./store.update";

const createModelWithTodos = (todos: SessionModel["todos"]): SessionModel => ({
  ...createInitialModel(),
  todos,
  nextTodoId: todos.reduce((maxId, todo) => Math.max(maxId, todo.id), 0) + 1,
});

const createModelWithQueue = (queuedMessages: SessionModel["queuedMessages"]): SessionModel => ({
  ...createInitialModel(),
  queuedMessages,
});

function isResultWithValue(
  result: SessionUpdateResult
): result is SessionUpdateResultWithValue<unknown> {
  return typeof result === "object" && "result" in result && "model" in result;
}

function asSessionModel(result: SessionUpdateResult): SessionModel {
  if (isResultWithValue(result)) {
    throw new Error("Expected SessionModel but got SessionUpdateResultWithValue");
  }
  return result;
}

const testModel = {
  id: "test",
  name: "Test Model",
  provider: "openai" as const,
  capabilities: { reasoning: false },
};

describe("session update", () => {
  describe("createInitialModel", () => {
    it("sets default reasoning effort to medium", () => {
      const model = createInitialModel();

      expect(model.reasoningEffort).toBe("medium");
    });
  });

  describe("SET_MODEL", () => {
    it("sets the model", () => {
      const model = createInitialModel();

      const result = update(model, { type: "SET_MODEL", model: testModel });

      expect(result).toEqual({ ...model, model: testModel });
    });

    it("can set model to undefined", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        model: testModel,
      };

      const result = update(model, { type: "SET_MODEL", model: undefined });

      expect(result).toEqual({ ...model, model: undefined });
    });

    it("does not modify other state", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        draftMessage: "test draft",
        httpRequest: "test request",
      };

      const result = asSessionModel(update(model, { type: "SET_MODEL", model: testModel }));

      expect(result.draftMessage).toBe("test draft");
      expect(result.httpRequest).toBe("test request");
    });
  });

  describe("SET_REASONING_EFFORT", () => {
    it("sets reasoning effort", () => {
      const model = createInitialModel();

      const result = asSessionModel(
        update(model, { type: "SET_REASONING_EFFORT", reasoningEffort: "low" })
      );

      expect(result.reasoningEffort).toBe("low");
    });

    it("does not modify other state", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        draftMessage: "test draft",
      };

      const result = asSessionModel(
        update(model, { type: "SET_REASONING_EFFORT", reasoningEffort: "medium" })
      );

      expect(result.draftMessage).toBe("test draft");
      expect(result.reasoningEffort).toBe("medium");
    });
  });

  describe("ADD_TODO", () => {
    it("adds a new todo to the list", () => {
      const model = createInitialModel();

      const result = update(model, { type: "ADD_TODO", content: "Test todo" });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).toHaveLength(1);
        expect(result.model.todos[0]).toEqual({
          id: 1,
          content: "Test todo",
          status: "pending",
        });
        expect(result.model.nextTodoId).toBe(2);
        expect(result.result).toEqual({
          kind: "Ok",
          value: { id: 1, content: "Test todo", status: "pending" },
        });
      }
    });

    it("appends to existing todos", () => {
      const model = createModelWithTodos([{ id: 4, content: "Existing todo", status: "pending" }]);

      const result = update(model, { type: "ADD_TODO", content: "New todo" });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).toHaveLength(2);
        expect(result.model.todos[1]).toEqual({
          id: 5,
          content: "New todo",
          status: "pending",
        });
        expect(result.model.nextTodoId).toBe(6);
      }
    });

    it("creates a new array instance", () => {
      const model = createModelWithTodos([{ id: 1, content: "Existing", status: "pending" }]);

      const result = update(model, { type: "ADD_TODO", content: "New" });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).not.toBe(model.todos);
      }
    });

    it("keeps incrementing IDs after removals", () => {
      const model = {
        ...createModelWithTodos([{ id: 1, content: "Remaining", status: "pending" }]),
        nextTodoId: 3,
      };

      const result = update(model, { type: "ADD_TODO", content: "Later todo" });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos[1]).toEqual({
          id: 3,
          content: "Later todo",
          status: "pending",
        });
        expect(result.model.nextTodoId).toBe(4);
      }
    });
  });

  describe("START_TODO", () => {
    it("marks one todo as in progress", () => {
      const model = createModelWithTodos([{ id: 1, content: "Test", status: "pending" }]);

      const result = update(model, { type: "START_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos[0]?.status).toBe("in_progress");
        expect(result.result).toEqual({
          kind: "Ok",
          value: { id: 1, content: "Test", status: "in_progress" },
        });
      }
    });

    it("moves a previously active todo back to pending", () => {
      const model = createModelWithTodos([
        { id: 1, content: "First", status: "in_progress" },
        { id: 2, content: "Second", status: "pending" },
      ]);

      const result = update(model, { type: "START_TODO", id: 2 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).toEqual([
          { id: 1, content: "First", status: "pending" },
          { id: 2, content: "Second", status: "in_progress" },
        ]);
      }
    });

    it("returns error when todo not found", () => {
      const model = createInitialModel();

      const result = update(model, { type: "START_TODO", id: 999 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.result).toEqual({
          kind: "Error",
          error: 'Todo with id "999" not found',
        });
        expect(result.model).toBe(model);
      }
    });

    it("returns error when todo is already completed", () => {
      const model = createModelWithTodos([{ id: 1, content: "Done", status: "completed" }]);

      const result = update(model, { type: "START_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.result).toEqual({
          kind: "Error",
          error: 'Todo "1" is already completed',
        });
        expect(result.model).toBe(model);
      }
    });
  });

  describe("COMPLETE_TODO", () => {
    it("marks an existing todo as completed", () => {
      const model = createModelWithTodos([{ id: 1, content: "Test", status: "pending" }]);

      const result = update(model, { type: "COMPLETE_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos[0]?.status).toBe("completed");
        expect(result.result).toEqual({
          kind: "Ok",
          value: { id: 1, content: "Test", status: "completed" },
        });
      }
    });

    it("completes an in-progress todo", () => {
      const model = createModelWithTodos([{ id: 1, content: "Test", status: "in_progress" }]);

      const result = update(model, { type: "COMPLETE_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos[0]?.status).toBe("completed");
      }
    });

    it("returns error when todo not found", () => {
      const model = createInitialModel();

      const result = update(model, { type: "COMPLETE_TODO", id: 999 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.result).toEqual({
          kind: "Error",
          error: 'Todo with id "999" not found',
        });
        expect(result.model).toBe(model);
      }
    });

    it("returns error when todo is already completed", () => {
      const model = createModelWithTodos([{ id: 1, content: "Test", status: "completed" }]);

      const result = update(model, { type: "COMPLETE_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.result).toEqual({
          kind: "Error",
          error: 'Todo "1" is already completed',
        });
        expect(result.model).toBe(model);
      }
    });

    it("preserves other todos", () => {
      const model = createModelWithTodos([
        { id: 1, content: "First", status: "pending" },
        { id: 2, content: "Second", status: "pending" },
      ]);

      const result = update(model, { type: "COMPLETE_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).toHaveLength(2);
        expect(result.model.todos[1]).toEqual({
          id: 2,
          content: "Second",
          status: "pending",
        });
      }
    });
  });

  describe("REMOVE_TODO", () => {
    it("removes an existing todo", () => {
      const model = createModelWithTodos([{ id: 1, content: "Test", status: "pending" }]);

      const result = update(model, { type: "REMOVE_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).toHaveLength(0);
        expect(result.result).toEqual({
          kind: "Ok",
          value: { id: 1, content: "Test", status: "pending" },
        });
      }
    });

    it("returns error when todo not found", () => {
      const model = createInitialModel();

      const result = update(model, { type: "REMOVE_TODO", id: 999 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.result).toEqual({
          kind: "Error",
          error: 'Todo with id "999" not found',
        });
        expect(result.model).toBe(model);
      }
    });

    it("preserves other todos", () => {
      const model = createModelWithTodos([
        { id: 1, content: "First", status: "pending" },
        { id: 2, content: "Second", status: "pending" },
      ]);

      const result = update(model, { type: "REMOVE_TODO", id: 1 });

      expect(isResultWithValue(result)).toBe(true);
      if (isResultWithValue(result)) {
        expect(result.model.todos).toHaveLength(1);
        expect(result.model.todos[0]).toEqual({
          id: 2,
          content: "Second",
          status: "pending",
        });
      }
    });
  });

  describe("CLEAR_TODOS", () => {
    it("clears all todos", () => {
      const model = createModelWithTodos([
        { id: 1, content: "First", status: "pending" },
        { id: 2, content: "Second", status: "completed" },
      ]);

      const result = asSessionModel(update(model, { type: "CLEAR_TODOS" }));

      expect(result.todos).toHaveLength(0);
    });

    it("returns empty array when already empty", () => {
      const model = createInitialModel();

      const result = asSessionModel(update(model, { type: "CLEAR_TODOS" }));

      expect(result.todos).toHaveLength(0);
    });

    it("does not modify other state", () => {
      const model: SessionModel = {
        ...createModelWithTodos([{ id: 1, content: "Test", status: "pending" }]),
        draftMessage: "test draft",
      };

      const result = asSessionModel(update(model, { type: "CLEAR_TODOS" }));

      expect(result.draftMessage).toBe("test draft");
    });
  });

  describe("ADD_TO_QUEUE", () => {
    it("adds a message to the queue", () => {
      const model = createInitialModel();
      const createdAt = Date.now();

      const result = asSessionModel(
        update(model, { type: "ADD_TO_QUEUE", id: "msg-1", text: "Test message", createdAt })
      );

      expect(result.queuedMessages).toHaveLength(1);
      expect(result.queuedMessages[0]).toEqual({ id: "msg-1", text: "Test message", createdAt });
    });

    it("appends to existing queue", () => {
      const createdAt1 = Date.now() - 1000;
      const createdAt2 = Date.now();
      const model = createModelWithQueue([{ id: "msg-1", text: "First", createdAt: createdAt1 }]);

      const result = asSessionModel(
        update(model, { type: "ADD_TO_QUEUE", id: "msg-2", text: "Second", createdAt: createdAt2 })
      );

      expect(result.queuedMessages).toHaveLength(2);
      expect(result.queuedMessages[1]).toEqual({
        id: "msg-2",
        text: "Second",
        createdAt: createdAt2,
      });
    });

    it("creates a new array instance", () => {
      const model = createModelWithQueue([{ id: "msg-1", text: "First", createdAt: Date.now() }]);

      const result = asSessionModel(
        update(model, { type: "ADD_TO_QUEUE", id: "msg-2", text: "Second", createdAt: Date.now() })
      );

      expect(result.queuedMessages).not.toBe(model.queuedMessages);
    });
  });

  describe("REMOVE_FROM_QUEUE", () => {
    it("removes a message from the queue", () => {
      const model = createModelWithQueue([{ id: "msg-1", text: "Test", createdAt: Date.now() }]);

      const result = asSessionModel(update(model, { type: "REMOVE_FROM_QUEUE", id: "msg-1" }));

      expect(result.queuedMessages).toHaveLength(0);
    });

    it("preserves other messages", () => {
      const model = createModelWithQueue([
        { id: "msg-1", text: "First", createdAt: Date.now() - 1000 },
        { id: "msg-2", text: "Second", createdAt: Date.now() },
      ]);

      const result = asSessionModel(update(model, { type: "REMOVE_FROM_QUEUE", id: "msg-1" }));

      expect(result.queuedMessages).toHaveLength(1);
      expect(result.queuedMessages[0]?.id).toBe("msg-2");
    });

    it("returns unchanged when message not found", () => {
      const model = createModelWithQueue([{ id: "msg-1", text: "Test", createdAt: Date.now() }]);

      const result = asSessionModel(
        update(model, { type: "REMOVE_FROM_QUEUE", id: "nonexistent" })
      );

      expect(result.queuedMessages).toHaveLength(1);
    });
  });

  describe("MOVE_TO_FRONT_OF_QUEUE", () => {
    it("moves message to front of queue", () => {
      const model = createModelWithQueue([
        { id: "msg-1", text: "First", createdAt: Date.now() - 2000 },
        { id: "msg-2", text: "Second", createdAt: Date.now() - 1000 },
        { id: "msg-3", text: "Third", createdAt: Date.now() },
      ]);

      const result = asSessionModel(update(model, { type: "MOVE_TO_FRONT_OF_QUEUE", id: "msg-3" }));

      expect(result.queuedMessages[0]?.id).toBe("msg-3");
      expect(result.queuedMessages[1]?.id).toBe("msg-1");
      expect(result.queuedMessages[2]?.id).toBe("msg-2");
    });

    it("returns unchanged when message is already at front", () => {
      const model = createModelWithQueue([
        { id: "msg-1", text: "First", createdAt: Date.now() - 1000 },
        { id: "msg-2", text: "Second", createdAt: Date.now() },
      ]);

      const result = update(model, { type: "MOVE_TO_FRONT_OF_QUEUE", id: "msg-1" });

      expect(result).toBe(model);
    });

    it("returns unchanged when message not found", () => {
      const model = createModelWithQueue([{ id: "msg-1", text: "First", createdAt: Date.now() }]);

      const result = update(model, { type: "MOVE_TO_FRONT_OF_QUEUE", id: "nonexistent" });

      expect(result).toBe(model);
    });

    it("returns unchanged when queue is empty", () => {
      const model = createInitialModel();

      const result = update(model, { type: "MOVE_TO_FRONT_OF_QUEUE", id: "msg-1" });

      expect(result).toBe(model);
    });
  });

  describe("CLEAR_QUEUED_MESSAGES", () => {
    it("clears all queued messages", () => {
      const model = createModelWithQueue([
        { id: "msg-1", text: "First", createdAt: Date.now() - 1000 },
        { id: "msg-2", text: "Second", createdAt: Date.now() },
      ]);

      const result = asSessionModel(update(model, { type: "CLEAR_QUEUED_MESSAGES" }));

      expect(result.queuedMessages).toHaveLength(0);
    });

    it("returns empty array when already empty", () => {
      const model = createInitialModel();

      const result = asSessionModel(update(model, { type: "CLEAR_QUEUED_MESSAGES" }));

      expect(result.queuedMessages).toHaveLength(0);
    });
  });

  describe("SET_DRAFT_MESSAGE", () => {
    it("sets the draft message", () => {
      const model = createInitialModel();

      const result = asSessionModel(
        update(model, { type: "SET_DRAFT_MESSAGE", value: "New draft" })
      );

      expect(result.draftMessage).toBe("New draft");
    });

    it("can set to empty string", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        draftMessage: "Some text",
      };

      const result = asSessionModel(update(model, { type: "SET_DRAFT_MESSAGE", value: "" }));

      expect(result.draftMessage).toBe("");
    });

    it("does not modify other state", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        httpRequest: "test request",
      };

      const result = asSessionModel(
        update(model, { type: "SET_DRAFT_MESSAGE", value: "New draft" })
      );

      expect(result.httpRequest).toBe("test request");
    });
  });

  describe("SET_HTTP_REQUEST", () => {
    it("sets the http request", () => {
      const model = createInitialModel();

      const result = asSessionModel(
        update(model, { type: "SET_HTTP_REQUEST", value: "GET /api/test HTTP/1.1" })
      );

      expect(result.httpRequest).toBe("GET /api/test HTTP/1.1");
    });

    it("can set to empty string", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        httpRequest: "Some request",
      };

      const result = asSessionModel(update(model, { type: "SET_HTTP_REQUEST", value: "" }));

      expect(result.httpRequest).toBe("");
    });

    it("does not modify other state", () => {
      const model: SessionModel = {
        ...createInitialModel(),
        draftMessage: "test draft",
      };

      const result = asSessionModel(
        update(model, { type: "SET_HTTP_REQUEST", value: "POST /api/test" })
      );

      expect(result.draftMessage).toBe("test draft");
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
