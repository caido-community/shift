import * as collection from "@/agent/collection";
import { initializeBinaryExecutionStream } from "@/agent/tools/binaries";
import { useAgentStore } from "@/stores/agent";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

export const setupAgents = (sdk: FrontendSDK) => {
  initializeBinaryExecutionStream(sdk);
  const collections = collection.setup(sdk);
  const uiStore = useUIStore();
  const agentStore = useAgentStore();

  const selectSession = (sessionId: string | undefined) => {
    if (isPresent(sessionId)) {
      agentStore.selectSession(sessionId);
    } else {
      agentStore.clearSessionSelection();
    }
  };

  const syncSession = () => {
    selectSession(sdk.replay.getCurrentSession()?.id);
  };

  const toggleDrawer = () => {
    syncSession();
    uiStore.toggleDrawer();
  };

  sdk.replay.addToSlot("topbar", {
    type: "Button",
    label: "Agent",
    onClick: toggleDrawer,
  });

  sdk.commands.register("shift:toggle-drawer", {
    name: "Toggle Shift Agents Drawer",
    run: toggleDrawer,
  });

  sdk.shortcuts.register("shift:toggle-drawer", ["shift", "control", "i"]);

  sdk.replay.onCurrentSessionChange((event) => {
    selectSession(event.sessionId);
  });

  const startDeletedReplaySessionSubscription = async () => {
    for await (const event of sdk.graphql.deletedReplaySession()) {
      const deletedSessionId = event.deletedReplaySession.deletedSessionId;
      if (!isPresent(deletedSessionId)) {
        continue;
      }

      if (agentStore.selectedSessionId === deletedSessionId) {
        agentStore.clearSessionSelection();
      }

      collections.onSessionDeleted(deletedSessionId);
      await agentStore.removeSession(deletedSessionId);
    }
  };

  sdk.navigation.onPageChange((event) => {
    if (event.path !== "/replay") {
      return;
    }

    syncSession();
  });

  sdk.projects.onCurrentProjectChange(() => {
    agentStore.reset();
    collections.onProjectChange();
  });

  syncSession();
  startDeletedReplaySessionSubscription();
};
