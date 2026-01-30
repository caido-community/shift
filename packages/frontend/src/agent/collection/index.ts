import type {
  CreatedReplaySessionSubscription,
  UpdatedReplaySessionSubscription,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import type { AgentSkillDefinition } from "shared";

import { LaunchDialog, type LaunchDialogResult } from "@/components/LaunchDialog";
import { useAgentStore } from "@/stores/agent";
import { useSettingsStore } from "@/stores/settings";
import { useSkillsStore } from "@/stores/skills";
import { useUIStore } from "@/stores/ui";
import type { FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

const SHIFT_COLLECTION_NAME = "Shift";

const sessionToCollectionId = new Map<string, string | undefined>();

function findSkillsByCollectionName(collectionName: string): AgentSkillDefinition[] {
  const skillsStore = useSkillsStore();
  return skillsStore.definitions.filter((skill) => skill.autoExecuteCollection === collectionName);
}

async function ensureCollection(
  sdk: FrontendSDK
): Promise<{ id: string; name: string } | undefined> {
  const settingsStore = useSettingsStore();
  const collections = sdk.replay.getCollections();

  if (collections.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return ensureCollection(sdk);
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
      component: LaunchDialog,
      props: {
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

function autoLaunchAgent(sdk: FrontendSDK, sessionId: string, skillIds: string[]) {
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

  if (skillIds.length > 0) {
    session.store.setSelectedSkillIds(skillIds);
  }

  agentStore.dispatch({ type: "SELECT_SESSION", sessionId });
  sdk.replay.openTab(sessionId);
  uiStore.setDrawerVisible(true);

  session.chat.sendMessage({ text: "Proceed with testing." });
}

function launchAgent(sdk: FrontendSDK, sessionId: string, config: LaunchDialogResult) {
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

  if (isPresent(config.model)) {
    session.model = config.model;
  }

  if (config.selectedSkillIds.length > 0) {
    session.store.setSelectedSkillIds(config.selectedSkillIds);
  }

  agentStore.dispatch({ type: "SELECT_SESSION", sessionId });
  sdk.replay.openTab(sessionId);
  uiStore.setDrawerVisible(true);

  let message = config.instructions.trim();
  if (message === "") {
    message = "Proceed with testing.";
  }

  if (config.selections.length > 0) {
    const selectionsText = config.selections
      .map((s) => {
        if (s.comment !== "") {
          return `- Selection: "${s.selection}"\n  Comment: ${s.comment}`;
        }
        return `- Selection: "${s.selection}"`;
      })
      .join("\n");
    message = `${message}\n\nHighlighted selections:\n${selectionsText}`;
  }

  session.chat.sendMessage({ text: message });
}

function handleSessionInCollection(sdk: FrontendSDK, sessionId: string, collectionName: string) {
  const boundSkills = findSkillsByCollectionName(collectionName);

  if (boundSkills.length > 0) {
    const skillIds = boundSkills.map((s) => s.id);
    autoLaunchAgent(sdk, sessionId, skillIds);
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

  const collections = sdk.replay.getCollections();
  const collection = collections.find((col) => col.id === collectionId);
  const collectionName = collection?.name;

  if (collectionName === undefined) return;

  handleSessionInCollection(sdk, session.id, collectionName);
}

function handleUpdatedReplaySession(sdk: FrontendSDK, result: UpdatedReplaySessionSubscription) {
  const { updatedReplaySession: data } = result;
  const session = data.sessionEdge.node;
  const previousCollectionId = sessionToCollectionId.get(session.id);
  const nextCollectionId = session.collection?.id;

  if (previousCollectionId === nextCollectionId) return;

  sessionToCollectionId.set(session.id, nextCollectionId);

  if (nextCollectionId === undefined) return;

  const collections = sdk.replay.getCollections();
  const collection = collections.find((col) => col.id === nextCollectionId);
  const collectionName = collection?.name;

  if (collectionName === undefined) return;

  handleSessionInCollection(sdk, session.id, collectionName);
}

function loadCurrentSessions(sdk: FrontendSDK) {
  const collections = sdk.replay.getCollections();
  for (const collection of collections) {
    const { sessionIds, id } = collection ?? {};
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
