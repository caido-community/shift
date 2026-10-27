import type { AgentContext } from "@/agent/context";
import { computeRequestDiff } from "@/agent/utils/requestDiff";

export function editRequest(context: AgentContext, toolCallId: string, raw: string): void {
  const diff = computeRequestDiff(context.httpRequest, raw);
  context.setHttpRequest(raw);
  if (diff !== undefined) {
    context.writer?.write({ type: "data-request-diff", data: { toolCallId, ...diff } });
  }
}
