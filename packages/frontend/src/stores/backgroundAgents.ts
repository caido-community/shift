import { defineStore } from "pinia";
import { computed, readonly, shallowRef } from "vue";

import { generateId } from "../agent/utils/id";

export type BackgroundAgentStatus = "queued" | "running" | "done" | "error" | "aborted";
type BackgroundAgentLogLevel = "info" | "success" | "error";

export type BackgroundAgentLog = {
  id: string;
  text: string;
  level: BackgroundAgentLogLevel;
  createdAt: number;
};

export type BackgroundAgent = {
  id: string;
  title: string;
  task: string;
  status: BackgroundAgentStatus;
  createdAt: number;
  updatedAt: number;
  startedAt: number | undefined;
  finishedAt: number | undefined;
  expanded: boolean;
  error: string | undefined;
  logs: BackgroundAgentLog[];
};

type CreateBackgroundAgentInput = {
  task: string;
  title: string;
};

export const useBackgroundAgentsStore = defineStore("backgroundAgents", () => {
  const agents = shallowRef<BackgroundAgent[]>([]);
  const controllers = new Map<string, AbortController>();

  const patchAgent = (agentId: string, updater: (agent: BackgroundAgent) => BackgroundAgent) => {
    agents.value = agents.value.map((agent) => (agent.id === agentId ? updater(agent) : agent));
  };

  const createAgent = (input: CreateBackgroundAgentInput): string => {
    const id = `bg-${generateId(10)}`;
    const now = Date.now();
    const agent: BackgroundAgent = {
      id,
      title: input.title,
      task: input.task,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      startedAt: undefined,
      finishedAt: undefined,
      expanded: true,
      error: undefined,
      logs: [],
    };
    agents.value = [agent, ...agents.value];
    return id;
  };

  const appendLog = (agentId: string, text: string, level: BackgroundAgentLogLevel = "info") => {
    const now = Date.now();
    patchAgent(agentId, (agent) => ({
      ...agent,
      updatedAt: now,
      logs: [
        ...agent.logs,
        {
          id: `${now}-${generateId(6)}`,
          text,
          level,
          createdAt: now,
        },
      ],
    }));
  };

  const setRunning = (agentId: string) => {
    const now = Date.now();
    patchAgent(agentId, (agent) => ({
      ...agent,
      status: "running",
      updatedAt: now,
      startedAt: agent.startedAt ?? now,
      finishedAt: undefined,
      error: undefined,
    }));
  };

  const setDone = (agentId: string) => {
    const now = Date.now();
    patchAgent(agentId, (agent) => ({
      ...agent,
      status: "done",
      updatedAt: now,
      finishedAt: now,
      error: undefined,
    }));
    controllers.delete(agentId);
  };

  const setError = (agentId: string, error: string) => {
    const now = Date.now();
    patchAgent(agentId, (agent) => ({
      ...agent,
      status: "error",
      updatedAt: now,
      finishedAt: now,
      error,
    }));
    controllers.delete(agentId);
  };

  const setAborted = (agentId: string) => {
    const now = Date.now();
    patchAgent(agentId, (agent) => ({
      ...agent,
      status: "aborted",
      updatedAt: now,
      finishedAt: now,
      error: undefined,
    }));
    controllers.delete(agentId);
  };

  const toggleExpanded = (agentId: string) => {
    patchAgent(agentId, (agent) => ({
      ...agent,
      expanded: !agent.expanded,
      updatedAt: Date.now(),
    }));
  };

  const removeAgent = (agentId: string) => {
    const controller = controllers.get(agentId);
    if (controller !== undefined) {
      controller.abort("USER_ABORTED");
      controllers.delete(agentId);
    }
    agents.value = agents.value.filter((agent) => agent.id !== agentId);
  };

  const clearFinished = () => {
    agents.value = agents.value.filter(
      (agent) => agent.status === "queued" || agent.status === "running"
    );
  };

  const registerController = (agentId: string, controller: AbortController) => {
    controllers.set(agentId, controller);
  };

  const cancelAgent = (agentId: string) => {
    const controller = controllers.get(agentId);
    if (controller !== undefined) {
      controller.abort("USER_ABORTED");
    }
  };

  const clearController = (agentId: string) => {
    controllers.delete(agentId);
  };

  const completeToolLog = (
    agentId: string,
    toolName: string,
    text: string,
    level: BackgroundAgentLogLevel
  ) => {
    const now = Date.now();
    patchAgent(agentId, (agent) => {
      const expectedCallingText = `Calling ${toolName}`;
      const index = [...agent.logs]
        .reverse()
        .findIndex((log) => log.text === expectedCallingText && log.level === "info");

      if (index === -1) {
        return {
          ...agent,
          updatedAt: now,
          logs: [
            ...agent.logs,
            {
              id: `${now}-${generateId(6)}`,
              text,
              level,
              createdAt: now,
            },
          ],
        };
      }

      const logs = [...agent.logs];
      const targetIndex = logs.length - 1 - index;
      const current = logs[targetIndex];
      if (current === undefined) {
        return {
          ...agent,
          updatedAt: now,
        };
      }

      logs[targetIndex] = {
        ...current,
        text,
        level,
      };

      return {
        ...agent,
        updatedAt: now,
        logs,
      };
    });
  };

  return {
    state: readonly(agents),
    agents: computed(() => agents.value),
    hasAgents: computed(() => agents.value.length > 0),
    createAgent,
    appendLog,
    setRunning,
    setDone,
    setError,
    setAborted,
    toggleExpanded,
    removeAgent,
    clearFinished,
    registerController,
    cancelAgent,
    clearController,
    completeToolLog,
  };
});
