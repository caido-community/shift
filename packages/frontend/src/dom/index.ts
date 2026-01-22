import { useDrawerManager } from "@/dom/drawer";
import { useIndicatorManager } from "@/dom/indicators";
import { type FrontendSDK } from "@/types";

export const createDOMManager = (sdk: FrontendSDK) => {
  const drawer = useDrawerManager(sdk);
  const indicators = useIndicatorManager(sdk);

  return {
    drawer,
    indicators,
    stop: () => {
      drawer.stop();
      indicators.stop();
    },
  };
};
