import type { Plugin } from "vue";

import { type FrontendSDK } from "@/types";

let sdkInstance: FrontendSDK | undefined;

export const SDKPlugin: Plugin = (_app, sdk: FrontendSDK) => {
  sdkInstance = sdk;
};

export const useSDK = (): FrontendSDK => {
  if (sdkInstance === undefined) {
    throw new Error("SDK not initialized");
  }
  return sdkInstance;
};
