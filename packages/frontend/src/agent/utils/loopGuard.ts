type ToolCallLike = { toolName: string; input?: unknown };
type StepLike = { toolCalls?: ToolCallLike[] };

/**
 * Number of consecutive identical tool-call steps that count as a stuck loop.
 */
export const REPEATED_TOOL_CALL_LIMIT = 5;

function stepSignature(step: StepLike): string | undefined {
  const calls = step.toolCalls ?? [];
  if (calls.length === 0) {
    return undefined;
  }

  return calls
    .map((call) => {
      let input = "";
      try {
        input = JSON.stringify(call.input ?? null);
      } catch {
        input = String(call.input);
      }
      return `${call.toolName}:${input}`;
    })
    .sort()
    .join("|");
}

/**
 * Detect a no-progress loop: the last `limit` tool-calling steps all issued the exact
 * same set of tool calls with identical arguments. This catches a model that keeps
 * re-issuing a call it believes had no effect (e.g. a tool that failed and returned no
 * usable result), bounding the loop well before the iteration cap.
 */
export function hasRepeatedToolCalls(
  steps: StepLike[],
  limit: number = REPEATED_TOOL_CALL_LIMIT
): boolean {
  if (limit <= 1) {
    return false;
  }

  const signatures = steps
    .map(stepSignature)
    .filter((signature): signature is string => signature !== undefined);

  if (signatures.length < limit) {
    return false;
  }

  const recent = signatures.slice(-limit);
  const [first] = recent;
  return recent.every((signature) => signature === first);
}
