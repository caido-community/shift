import { useAgentIndicatorManager } from "@/dom/agentIndicators";
import { useDrawerManager } from "@/dom/drawer";
import { type FrontendSDK } from "@/types";

export const createDOMManager = (sdk: FrontendSDK) => {
  const drawer = useDrawerManager(sdk);
  const indicators = useAgentIndicatorManager(sdk);

  return {
    drawer,
    indicators,
    stop: () => {
      drawer.stop();
      indicators.stop();
    },
  };
};
