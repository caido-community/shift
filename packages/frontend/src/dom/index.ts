import { useDrawerManager } from "@/dom/drawer";
import { useSessionManager } from "@/dom/session";
import { type FrontendSDK } from "@/types";

export const createDOMManager = (sdk: FrontendSDK) => {
  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
  window.addEventListener("locationchange", notify);

  setTimeout(() => {
    for (const cb of subscribers) {
      cb({ oldHash: lastHash, newHash: lastHash });
    }
  }, 100);

  const drawer = useDrawerManager(sdk);
  const session = useSessionManager(sdk);

  return {
    drawer,
    session,
    stop: () => {
      drawer.stop();
      session.stop();
    },
  };
};

// Temporary workaround for missing sdk.navigation.onPageChange
type LocationChange = {
  oldHash: string;
  newHash: string;
};

export type Callback = (change: LocationChange) => void;

const subscribers = new Set<Callback>();
let lastHash = window.location.hash;

function notify(): void {
  const newHash = window.location.hash;
  if (newHash === lastHash) return;
  for (const cb of subscribers) {
    try {
      cb({ oldHash: lastHash, newHash });
    } catch {
      // ignore
    }
  }
  lastHash = newHash;
}

const patchHistoryMethod = (method: "pushState" | "replaceState"): void => {
  const original = history[method];
  history[method] = function (...args: Parameters<typeof original>) {
    const result = original.apply(this, args);
    window.dispatchEvent(new Event("locationchange"));
    return result;
  };
};

export function onLocationChange(cb: Callback): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}
