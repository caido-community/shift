import type {
  CreatedReplaySessionSubscription,
  UpdatedReplaySessionSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import type { CustomAgent } from "shared";

import type { AgentSession } from "@/agent/session";
import { LaunchDialog, type LaunchDialogResult } from "@/components/LaunchDialog";
import { useAgentStore } from "@/stores/agent";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useSettingsStore } from "@/stores/settings";
import { useUIStore } from "@/stores/ui";
import type { FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

const SHIFT_COLLECTION_NAME = "Shift";

const sessionToCollectionId = new Map<string, string | undefined>();

let pendingCollection: Promise<{ id: string; name: string } | undefined> | undefined;

function findAgentsByCollectionName(collectionName: string): CustomAgent[] {
  const customAgentsStore = useCustomAgentsStore();
  return customAgentsStore.definitions.filter((agent) =>
    agent.boundCollections.includes(collectionName)
  );
}

function ensureCollection(sdk: FrontendSDK): Promise<{ id: string; name: string } | undefined> {
  pendingCollection ??= findOrCreateCollection(sdk).finally(() => {
    pendingCollection = undefined;
  });
  return pendingCollection;
}

async function findOrCreateCollection(
  sdk: FrontendSDK
): Promise<{ id: string; name: string } | undefined> {
  const settingsStore = useSettingsStore();
  const collections = sdk.replay.getCollections();

  if (collections.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return findOrCreateCollection(sdk);
  }

  const existing = collections.find((collection) => collection.name === SHIFT_COLLECTION_NAME);

  if (isPresent(existing)) {
    return existing;
  }

  if (settingsStore.autoCreateShiftCollection !== true) {
    return undefined;
  }

  return sdk.replay.createCollection(SHIFT_COLLECTION_NAME);
}

function showLaunchDialog(sdk: FrontendSDK, sessionId: string, preSelectedSkillIds?: string[]) {
  let dialog: { close: () => void } = { close: () => {} };

  const handleConfirm = (result: LaunchDialogResult) => {
    dialog.close();
    launchAgent(sdk, sessionId, result);
  };

  const handleCancel = () => {
    dialog.close();
  };

  dialog = sdk.window.showDialog(
    {
      component: LaunchDialog as never,
      props: {
        sessionId,
        onConfirm: () => handleConfirm,
        onCancel: () => handleCancel,
        initialSkillIds: preSelectedSkillIds,
      },
    },
    {
      title: "Shift Agent Launch",
      closeOnEscape: true,
      closable: true,
      draggable: true,
      modal: false,
      position: "center",
    }
  );
}

function startAgentSession(
  sdk: FrontendSDK,
  sessionId: string,
  text: string,
  configure: (session: AgentSession) => void
) {
  const agentStore = useAgentStore();
  const uiStore = useUIStore();

  if (!agentStore.isReady) {
    sdk.window.showToast("Agent not ready. Please configure a model first.", { variant: "error" });
    return;
  }

  let session;
  try {
    session = agentStore.getSession(sessionId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sdk.window.showToast(`Failed to create agent session: ${message}`, { variant: "error" });
    return;
  }

  if (session === undefined) {
    sdk.window.showToast("Failed to create agent session", { variant: "error" });
    return;
  }

  configure(session);

  agentStore.dispatch({ type: "SELECT_SESSION", sessionId });
  sdk.replay.openTab(sessionId);
  uiStore.setDrawerVisible(true);

  session.chat.sendMessage({ text });
}

function autoLaunchWithAgent(sdk: FrontendSDK, sessionId: string, agent: CustomAgent) {
  const customAgentsStore = useCustomAgentsStore();

  startAgentSession(sdk, sessionId, "Proceed with testing.", (session) => {
    const resolved = customAgentsStore.getAgentById(agent.id);
    if (resolved !== undefined) {
      session.store.setCustomAgent(resolved);
    }
  });
}

function launchAgent(sdk: FrontendSDK, sessionId: string, config: LaunchDialogResult) {
  const customAgentsStore = useCustomAgentsStore();
  const message = config.instructions === "" ? "Proceed with testing." : config.instructions;

  startAgentSession(sdk, sessionId, message, (session) => {
    if (isPresent(config.model)) {
      session.model = config.model;
    }

    session.store.setMode(config.mode);

    if (isPresent(config.customAgentId)) {
      const resolved = customAgentsStore.getAgentById(config.customAgentId);
      if (resolved !== undefined) {
        session.store.setCustomAgent(resolved);
      }
    } else if (config.selectedSkillIds.length > 0) {
      session.store.setSelectedSkillIds(config.selectedSkillIds);
    }
  });
}

function handleSessionInCollection(sdk: FrontendSDK, sessionId: string, collectionId: string) {
  const collectionName = sdk.replay
    .getCollections()
    .find((collection) => collection.id === collectionId)?.name;

  if (collectionName === undefined) return;

  const boundAgents = findAgentsByCollectionName(collectionName);

  if (boundAgents.length > 1) {
    sdk.window.showToast(
      `Multiple agents are bound to "${collectionName}". Keep only one bound agent per collection.`,
      { variant: "warning" }
    );

    if (collectionName === SHIFT_COLLECTION_NAME) {
      showLaunchDialog(sdk, sessionId);
    }

    return;
  }

  const agent = boundAgents[0];
  if (agent !== undefined) {
    autoLaunchWithAgent(sdk, sessionId, agent);
    return;
  }

  if (collectionName === SHIFT_COLLECTION_NAME) {
    showLaunchDialog(sdk, sessionId);
  }
}

function handleCreatedReplaySession(sdk: FrontendSDK, result: CreatedReplaySessionSubscription) {
  const { createdReplaySession: data } = result;
  const session = data.sessionEdge.node;
  const collectionId = session.collection?.id;

  sessionToCollectionId.set(session.id, collectionId);

  if (collectionId === undefined) return;

  handleSessionInCollection(sdk, session.id, collectionId);
}

function handleUpdatedReplaySession(sdk: FrontendSDK, result: UpdatedReplaySessionSubscription) {
  const { updatedReplaySession: data } = result;
  const session = data.sessionEdge.node;
  const previousCollectionId = sessionToCollectionId.get(session.id);
  const nextCollectionId = session.collection?.id;

  if (previousCollectionId === nextCollectionId) return;

  sessionToCollectionId.set(session.id, nextCollectionId);

  if (nextCollectionId === undefined) return;

  handleSessionInCollection(sdk, session.id, nextCollectionId);
}

function loadCurrentSessions(sdk: FrontendSDK) {
  const collections = sdk.replay.getCollections();
  for (const collection of collections) {
    const { sessionIds, id } = collection;
    for (const sessionId of sessionIds) {
      sessionToCollectionId.set(sessionId, id);
    }
  }
}

async function subscribeToCreatedReplaySession(sdk: FrontendSDK): Promise<void> {
  const createdReplaySession = sdk.graphql.createdReplaySession();
  for await (const result of createdReplaySession) {
    ensureCollection(sdk);
    handleCreatedReplaySession(sdk, result);
  }
}

async function subscribeToUpdatedReplaySession(sdk: FrontendSDK): Promise<void> {
  const updatedReplaySession = sdk.graphql.updatedReplaySession({});
  for await (const result of updatedReplaySession) {
    ensureCollection(sdk);
    handleUpdatedReplaySession(sdk, result);
  }
}

export function setup(sdk: FrontendSDK) {
  ensureCollection(sdk);

  loadCurrentSessions(sdk);

  subscribeToCreatedReplaySession(sdk);
  subscribeToUpdatedReplaySession(sdk);

  sdk.projects.onCurrentProjectChange(() => {
    sessionToCollectionId.clear();
    ensureCollection(sdk);
    loadCurrentSessions(sdk);
  });
}
