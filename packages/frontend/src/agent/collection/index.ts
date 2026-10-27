import type { ReplayCollection } from "@caido/sdk-frontend";

import type { AgentSession } from "@/agent/session";
import { LaunchDialog, type LaunchDialogResult } from "@/components/LaunchDialog";
import { useAgentStore } from "@/stores/agent";
import { useCustomAgentsStore } from "@/stores/custom-agents/store";
import { useSettingsStore } from "@/stores/settings";
import { useUIStore } from "@/stores/ui";
import type { FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

const SHIFT_COLLECTION_NAME = "Shift";
const DEFAULT_INSTRUCTIONS = "Proceed with testing.";
const COLLECTIONS_POLL_INTERVAL_MS = 200;
const COLLECTIONS_POLL_ATTEMPTS = 50;

export function setup(sdk: FrontendSDK) {
  const sessionCollections = new Map<string, string | undefined>();
  let creatingCollection: Promise<unknown> | undefined;

  function ensureShiftCollection(collections: ReplayCollection[]) {
    if (collections.length === 0 || creatingCollection !== undefined) return;
    if (collections.some((collection) => collection.name === SHIFT_COLLECTION_NAME)) return;
    if (!useSettingsStore().config.autoCreateShiftCollection) return;

    creatingCollection = sdk.replay
      .createCollection(SHIFT_COLLECTION_NAME)
      .catch((error: unknown) => console.error("Failed to create the Shift collection:", error))
      .finally(() => {
        creatingCollection = undefined;
      });
  }

  // Every project has a default collection, so an empty list means Replay is still loading it.
  async function waitForCollections(): Promise<ReplayCollection[]> {
    for (let attempt = 0; attempt < COLLECTIONS_POLL_ATTEMPTS; attempt++) {
      const collections = sdk.replay.getCollections();
      if (collections.length > 0) return collections;
      await new Promise((resolve) => setTimeout(resolve, COLLECTIONS_POLL_INTERVAL_MS));
    }
    return [];
  }

  async function syncCollections() {
    const collections = await waitForCollections();
    sessionCollections.clear();
    for (const { id, sessionIds } of collections) {
      for (const sessionId of sessionIds) {
        sessionCollections.set(sessionId, id);
      }
    }
    ensureShiftCollection(collections);
  }

  async function startAgent(
    sessionId: string,
    text: string,
    configure: (session: AgentSession) => void
  ) {
    const agentStore = useAgentStore();
    if (!agentStore.isReady) {
      sdk.window.showToast("Agent not ready. Please configure a model first.", {
        variant: "error",
      });
      return;
    }

    const session = await agentStore.openSession(sessionId);
    if (session === undefined) {
      sdk.window.showToast("Failed to create agent session", { variant: "error" });
      return;
    }

    configure(session);
    agentStore.selectSession(sessionId);
    sdk.replay.openTab(sessionId);
    useUIStore().setDrawerVisible(true);
    session.send(text);
  }

  function launchWithCustomAgent(sessionId: string, agentId: string) {
    startAgent(sessionId, DEFAULT_INSTRUCTIONS, (session) => {
      const agent = useCustomAgentsStore().getAgentById(agentId);
      if (agent !== undefined) {
        session.store.setCustomAgent(agent);
      }
    });
  }

  function launchFromDialog(sessionId: string, config: LaunchDialogResult) {
    const text = config.instructions === "" ? DEFAULT_INSTRUCTIONS : config.instructions;

    startAgent(sessionId, text, (session) => {
      if (isPresent(config.model)) {
        session.store.setModel(config.model);
      }
      session.store.setMode(config.mode);

      if (isPresent(config.customAgentId)) {
        const agent = useCustomAgentsStore().getAgentById(config.customAgentId);
        if (agent !== undefined) {
          session.store.setCustomAgent(agent);
        }
      } else if (config.selectedSkillIds.length > 0) {
        session.store.setSelectedSkillIds(config.selectedSkillIds);
      }
    });
  }

  function showLaunchDialog(sessionId: string) {
    const dialog = sdk.window.showDialog(
      {
        component: LaunchDialog as never,
        props: {
          sessionId,
          onConfirm: () => (result: LaunchDialogResult) => {
            dialog.close();
            launchFromDialog(sessionId, result);
          },
          onCancel: () => () => dialog.close(),
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

  function onAddedToCollection(sessionId: string, collectionId: string) {
    const collectionName = sdk.replay
      .getCollections()
      .find((collection) => collection.id === collectionId)?.name;
    if (collectionName === undefined) return;

    const boundAgents = useCustomAgentsStore().definitions.filter((agent) =>
      agent.boundCollections.includes(collectionName)
    );

    const [boundAgent] = boundAgents;
    if (boundAgents.length === 1 && boundAgent !== undefined) {
      launchWithCustomAgent(sessionId, boundAgent.id);
      return;
    }

    if (boundAgents.length > 1) {
      sdk.window.showToast(
        `Multiple agents are bound to "${collectionName}". Keep only one bound agent per collection.`,
        { variant: "warning" }
      );
    }

    if (collectionName === SHIFT_COLLECTION_NAME) {
      showLaunchDialog(sessionId);
    }
  }

  function onSessionCollection(sessionId: string, collectionId: string | undefined) {
    ensureShiftCollection(sdk.replay.getCollections());

    if (sessionCollections.get(sessionId) === collectionId) return;
    sessionCollections.set(sessionId, collectionId);

    if (collectionId !== undefined) {
      onAddedToCollection(sessionId, collectionId);
    }
  }

  async function watchCreatedSessions() {
    for await (const { createdReplaySession } of sdk.graphql.createdReplaySession()) {
      const session = createdReplaySession.sessionEdge.node;
      onSessionCollection(session.id, session.collection?.id);
    }
  }

  async function watchUpdatedSessions() {
    for await (const { updatedReplaySession } of sdk.graphql.updatedReplaySession({})) {
      const session = updatedReplaySession.sessionEdge.node;
      onSessionCollection(session.id, session.collection?.id);
    }
  }

  syncCollections();
  watchCreatedSessions();
  watchUpdatedSessions();

  return {
    onProjectChange() {
      syncCollections();
    },
    onSessionDeleted(sessionId: string) {
      sessionCollections.delete(sessionId);
    },
  };
}
