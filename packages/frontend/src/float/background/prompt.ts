import { type ActionContext } from "@/float/types";

export const BACKGROUND_EXECUTION_NOTE = `<background_execution_note>
You are a long-running background agent with a larger time/step budget than normal Float runs.
For multi-step tasks, prefer iterative execution over one-shot decisions.
When tools return partial data, continue reading/searching/paginating until you have enough coverage to make a reliable decision.
If a tool response indicates more data exists (for example hasNextPage, nextOffset, or cursor-based continuation), keep iterating before final write actions.
For HTTP history investigation tasks (analyze, identify, find flow, auth, login, oauth, reset, token, session), do not finalize after a single historyRead page when more data may exist.
For these history tasks, first paginate historyRead to build candidate sets, then perform focused deep inspection with historyRequestResponseRead before deciding final row IDs.
Do not call final write actions like httpqlQuerySet/filter/scope updates until at least one deep inspection pass is completed when request/response semantics matter.
When historyRead output includes both rowId and requestId, use rowId for row.id HTTPQL filtering and requestId for historyRequestResponseRead.
Use the available step budget for depth and confidence; optimize for correctness and coverage, not minimum step count.
Before final write actions, synthesize findings from gathered evidence and then apply concise, high-confidence changes.
Use available step budget for quality and completeness, but stop early once task goals are fully satisfied.
You also have access to HistoryRowHighlight for marking relevant history rows; it accepts metadataId or metadataIds from historyRead or historyRequestResponseRead, not request IDs.
</background_execution_note>`;

type BuildBackgroundPromptInput = {
  content: string;
  context: ActionContext;
};

export const buildBackgroundPrompt = (
  input: BuildBackgroundPromptInput,
  learnings: string[]
): string => {
  return `
<context>
${JSON.stringify(input.context)}
</context>

<learnings>
${learnings.map((learning, index) => `- ${index}: ${learning}`).join("\n")}
</learnings>

<user>
${input.content}
</user>
`.trim();
};
