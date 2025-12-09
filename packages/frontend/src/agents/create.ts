import { Chat } from "@ai-sdk/vue";

import { TodoManager } from "@/agents/todos";
import { ClientSideChatTransport } from "@/agents/transport";
import {
  type AgentRuntimeConfig,
  type CustomUIMessage,
  type ReplaySession,
  type ToolContext,
} from "@/agents/types";
import { type FrontendSDK } from "@/types";
import { getReplaySession, writeToRequestEditor } from "@/utils";

export async function createAgent({
  replaySessionId,
  sdk,
  config,
}: {
  replaySessionId: string;
  sdk: FrontendSDK;
  config: AgentRuntimeConfig;
}) {
  const initialSession = await getReplaySession(sdk, replaySessionId);
  if (initialSession.kind === "Error") {
    throw new Error(initialSession.error);
  }

  const todoManager = new TodoManager();
  const toolContext = buildToolContext({
    sdk,
    initialSession: initialSession.session,
    todoManager,
    config,
  });

  const transport = new ClientSideChatTransport(toolContext, sdk);

  const chat = new Chat<CustomUIMessage>({
    id: replaySessionId,
    transport,
  });

  return {
    chat,
    toolContext,
  };
}

function buildToolContext({
  sdk,
  initialSession,
  todoManager,
  config,
}: {
  sdk: FrontendSDK;
  initialSession: ReplaySession;
  todoManager: TodoManager;
  config: AgentRuntimeConfig;
}): ToolContext {
  const requestState = { ...initialSession.request };

  return {
    sdk,
    replaySession: {
      id: initialSession.id,
      activeEntryId: initialSession.activeEntryId,
      request: requestState,
      updateRequestRaw: (updater) => {
        const newRaw = updater(requestState.raw);
        requestState.raw = newRaw;

        // If user is on replay tab and has this tab open, update the request editor
        if (location.hash === "#/replay") {
          const currentSession = sdk.replay.getCurrentSession();
          if (currentSession !== undefined && currentSession.id === initialSession.id) {
            writeToRequestEditor(newRaw);
          }
        }

        return true;
      },
    },
    todoManager,
    config,
  };
}
