import type { Plugin } from "vue";

import { type FrontendSDK } from "@/types";

let sdkInstance: FrontendSDK | undefined;

const setSDK = (sdk: FrontendSDK) => {
  sdkInstance = sdk;
};

const getSDK = (): FrontendSDK => {
  if (!sdkInstance) {
    throw new Error("SDK not initialized");
  }
  return sdkInstance;
};

export const SDKPlugin: Plugin = (_app, sdk: FrontendSDK) => {
  setSDK(sdk);
};

export const useSDK = () => getSDK();
