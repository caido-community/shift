import { useBackgroundAgentsPanelManager } from "@/dom/backgroundAgents";
import { useDrawerManager } from "@/dom/drawer";
import { useIndicatorManager } from "@/dom/indicators";
import { type FrontendSDK } from "@/types";

export const createDOMManager = (sdk: FrontendSDK) => {
  const drawer = useDrawerManager(sdk);
  const indicators = useIndicatorManager(sdk);
  const backgroundAgentsPanel = useBackgroundAgentsPanelManager(sdk);

  return {
    drawer,
    indicators,
    backgroundAgentsPanel,
    stop: () => {
      drawer.stop();
      indicators.stop();
      backgroundAgentsPanel.stop();
    },
  };
};
