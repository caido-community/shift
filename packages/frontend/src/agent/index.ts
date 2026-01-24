import * as collection from "@/agent/collection";
import { useAgentStore } from "@/stores/agent";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

export const setupAgents = (sdk: FrontendSDK) => {
  collection.setup(sdk);
  const uiStore = useUIStore();
  const agentStore = useAgentStore();

  sdk.replay.addToSlot("topbar", {
    type: "Button",
    label: "Agent",
    onClick: () => uiStore.toggleDrawer(),
  });

  sdk.commands.register("shift:toggle-drawer", {
    name: "Toggle Shift Agents Drawer",
    run: () => uiStore.toggleDrawer(),
  });

  sdk.shortcuts.register("shift:toggle-drawer", ["shift", "control", "i"]);

  sdk.replay.onCurrentSessionChange((event) => {
    const newSessionId = event.sessionId;
    if (isPresent(newSessionId)) {
      agentStore.dispatch({ type: "SELECT_SESSION", sessionId: newSessionId });
    } else {
      agentStore.dispatch({ type: "CLEAR_SESSION_SELECTION" });
    }
  });

  const startDeletedReplaySessionSubscription = async () => {
    for await (const event of sdk.graphql.deletedReplaySession()) {
      const deletedSessionId = event.deletedReplaySession.deletedSessionId;
      if (!isPresent(deletedSessionId)) {
        continue;
      }

      if (agentStore.selectedSessionId === deletedSessionId) {
        agentStore.dispatch({ type: "CLEAR_SESSION_SELECTION" });
      }

      await agentStore.removeSession(deletedSessionId);
    }
  };

  const syncSession = () => {
    const currentReplaySession = sdk.replay.getCurrentSession();
    if (currentReplaySession === undefined) {
      return;
    }

    agentStore.dispatch({ type: "SELECT_SESSION", sessionId: currentReplaySession.id });
  };

  sdk.navigation.onPageChange((event) => {
    if (event.path !== "/replay") {
      return;
    }

    syncSession();
  });

  sdk.projects.onCurrentProjectChange(() => {
    agentStore.dispatch({ type: "RESET" });
  });

  syncSession();
  startDeletedReplaySessionSubscription();
};
