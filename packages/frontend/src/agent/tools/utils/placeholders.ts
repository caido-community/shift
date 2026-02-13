import type { Result } from "shared";

import type { AgentContext } from "@/agent/context";
import { resolvePlaceholders } from "@/agent/utils/placeholders";

export async function resolveToolInputPlaceholders(
  context: AgentContext,
  text: string
): Promise<Result<string>> {
  return resolvePlaceholders(context.sdk, text, {
    payloadBlobLookup: (blobId) => context.getPayloadBlob(blobId),
  });
}
