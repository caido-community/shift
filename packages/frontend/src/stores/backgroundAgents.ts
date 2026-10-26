import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";

import { generateId } from "../agent/utils/id";
import { type BackgroundAgentLogPart } from "../backgroundAgents/logs";

export type BackgroundAgentStatus = "queued" | "running" | "done" | "error" | "aborted";
type BackgroundAgentLogLevel = "info" | "success" | "error";

export type BackgroundAgentLog = {
  id: string;
  parts: BackgroundAgentLogPart[];
  level: BackgroundAgentLogLevel;
};

export type BackgroundAgent = {
  id: string;
  title: string;
  task: string;
  status: BackgroundAgentStatus;
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

  const patchAgent = (agentId: string, patch: Partial<BackgroundAgent>) => {
    agents.value = agents.value.map((agent) =>
      agent.id === agentId ? { ...agent, ...patch } : agent
    );
  };

  const createAgent = (input: CreateBackgroundAgentInput) => {
    const id = `bg-${generateId(10)}`;
    const controller = new AbortController();
    controllers.set(id, controller);
    agents.value = [
      {
        id,
        title: input.title,
        task: input.task,
        status: "queued",
        error: undefined,
        logs: [],
      },
      ...agents.value,
    ];
    return { id, signal: controller.signal };
  };

  const appendLog = (
    agentId: string,
    parts: BackgroundAgentLogPart[],
    level: BackgroundAgentLogLevel = "info"
  ) => {
    const agent = agents.value.find((entry) => entry.id === agentId);
    if (agent === undefined) return;

    patchAgent(agentId, {
      logs: [...agent.logs, { id: generateId(10), parts, level }],
    });
  };

  const setRunning = (agentId: string) => {
    patchAgent(agentId, { status: "running", error: undefined });
  };

  const finishAgent = (agentId: string, status: "done" | "error" | "aborted", error?: string) => {
    patchAgent(agentId, { status, error });
    controllers.delete(agentId);
  };

  const cancelAgent = (agentId: string) => {
    controllers.get(agentId)?.abort();
  };

  const removeAgent = (agentId: string) => {
    cancelAgent(agentId);
    controllers.delete(agentId);
    agents.value = agents.value.filter((agent) => agent.id !== agentId);
  };

  return {
    agents: computed(() => agents.value),
    hasAgents: computed(() => agents.value.length > 0),
    createAgent,
    appendLog,
    setRunning,
    finishAgent,
    cancelAgent,
    removeAgent,
  };
});
