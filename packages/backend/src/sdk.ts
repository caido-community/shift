import { type BackendSDK } from "./types";

let sdk: BackendSDK | undefined;

export function setSDK(_sdk: BackendSDK): void {
  sdk = _sdk;
}

export function requireSDK(): BackendSDK {
  if (sdk === undefined) {
    throw new Error("Backend SDK not initialized");
  }

  return sdk;
}
