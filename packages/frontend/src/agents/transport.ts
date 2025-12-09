import {
  type ChatRequestOptions,
  type ChatTransport,
  convertToModelMessages,
  createUIMessageStream,
  stepCountIs,
  streamText,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

import { BASE_SYSTEM_PROMPT } from "@/agents/prompt";
import { type TodoManager } from "@/agents/todos";
import {
  addCookieTool,
  addEnvironmentTool,
  addFindingTool,
  addLearningTool,
  addTodoTool,
  deleteCookieTool,
  deleteEnvironmentTool,
  environementContextTool,
  fetchReplayEntriesTool,
  grepRequestTool,
  grepResponseTool,
  removeLearningsTool,
  removeRequestHeaderTool,
  removeRequestQueryTool,
  replaceRequestTextTool,
  runJavaScriptTool,
  searchRequestsTool,
  sendRequestTool,
  setRequestBodyTool,
  setRequestHeaderTool,
  setRequestMethodTool,
  setRequestPathTool,
  setRequestQueryTool,
  setRequestRawTool,
  updateCookieTool,
  updateEnvironmentTool,
  updateLearningTool,
  updateTodoTool,
} from "@/agents/tools";
import {
  type AgentPromptConfig,
  type AgentRuntimeConfig,
  type CustomUIMessage,
  type ReplaySession,
  type ToolContext,
} from "@/agents/types";
import {
  fetchAgentEnvironments,
  summarizeAgentEnvironments,
} from "@/agents/utils/environment";
import { markdownJoinerTransform } from "@/agents/utils/markdownJoiner";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import { type FrontendSDK } from "@/types";
import { getReplaySession, isPresent } from "@/utils";

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Map) {
    return sanitizeValue(Object.fromEntries(value));
  }

  if (value instanceof Set) {
    return Array.from(value, (entry) => sanitizeValue(entry));
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      const sanitized = sanitizeValue(nestedValue);

      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }

    return result;
  }

  return value;
}

function sanitizeUiMessages(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => sanitizeValue(message) as UIMessage);
}

export class ClientSideChatTransport implements ChatTransport<UIMessage> {
  constructor(
    private toolContext: ToolContext,
    private sdk: FrontendSDK,
  ) {}

  async sendMessages(
    options: {
      chatId: string;
      messages: UIMessage[];
      abortSignal?: AbortSignal;
    } & {
      trigger: "submit-message" | "submit-tool-result" | "regenerate-message";
      messageId?: string;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { abortSignal, messages } = options;

    const initialSession = await getReplaySession(
      this.toolContext.sdk,
      this.toolContext.replaySession.id,
    );
    if (initialSession.kind === "Error") {
      throw new Error(initialSession.error);
    }

    //Dont touch these, it updates the request editor
    const currentRequest = this.toolContext.replaySession.request;
    currentRequest.raw = initialSession.session.request.raw;
    currentRequest.host = initialSession.session.request.host;
    currentRequest.port = initialSession.session.request.port;
    currentRequest.isTLS = initialSession.session.request.isTLS;
    currentRequest.SNI = initialSession.session.request.SNI;

    const prompt = convertToModelMessages(sanitizeUiMessages(messages));
    const configStore = useConfigStore();
    const runtimeConfig = this.toolContext.config;

    const modelId = runtimeConfig.model ?? configStore.agentsModel;
    const maxIterations =
      runtimeConfig.maxIterations ?? configStore.maxIterations;

    const provider = this.sdk.ai.createProvider();
    const model = provider(modelId, {
      reasoning: {
        effort: "high",
      },
      capabilities: {
        reasoning: true,
        structured_output: true,
      },
    });

    const stream = createUIMessageStream<CustomUIMessage>({
      execute: ({ writer }) => {
        const result = streamText({
          model,
          system: buildSystemPrompt(
            this.toolContext.replaySession.id,
            runtimeConfig,
          ),
          messages: prompt,
          abortSignal: abortSignal,
          stopWhen: stepCountIs(maxIterations),
          tools: {
            sendRequest: sendRequestTool,
            updateTodo: updateTodoTool,
            setRequestRaw: setRequestRawTool,
            setRequestQuery: setRequestQueryTool,
            setRequestPath: setRequestPathTool,
            setRequestMethod: setRequestMethodTool,
            setRequestHeader: setRequestHeaderTool,
            setRequestBody: setRequestBodyTool,
            updateCookie: updateCookieTool,
            addCookie: addCookieTool,
            deleteCookie: deleteCookieTool,
            runJavaScript: runJavaScriptTool,
            replaceRequestText: replaceRequestTextTool,
            removeRequestQuery: removeRequestQueryTool,
            removeRequestHeader: removeRequestHeaderTool,
            grepResponse: grepResponseTool,
            grepRequest: grepRequestTool,
            searchRequests: searchRequestsTool,
            fetchReplayEntries: fetchReplayEntriesTool,
            // navigateReplayEntry: navigateReplayEntryTool, // Currently not working in the Caido UI, so we're not using it.
            addTodo: addTodoTool,
            addLearning: addLearningTool,
            updateLearning: updateLearningTool,
            removeLearnings: removeLearningsTool,
            addFinding: addFindingTool,
            environementContext: environementContextTool,
            updateEnvironment: updateEnvironmentTool,
            addEnvironment: addEnvironmentTool,
            deleteEnvironment: deleteEnvironmentTool,
          },
          onFinish: () => {
            this.toolContext.todoManager.clearTodos();
          },
          prepareStep: async (step) => {
            let environmentSummaries: ReturnType<
              typeof summarizeAgentEnvironments
            > = [];
            try {
              const environments = await fetchAgentEnvironments(
                this.toolContext.sdk,
              );
              environmentSummaries = summarizeAgentEnvironments(environments);
            } catch (error) {
              console.warn(
                "[Shift Agents] Failed to load environments for context",
                error,
              );
            }

            return {
              messages: [
                ...step.messages,
                {
                  role: "user",
                  content: contextMessages({
                    currentRequest: this.toolContext.replaySession,
                    todoManager: this.toolContext.todoManager,
                    learnings: configStore.learnings,
                    environmentSummaries,
                  }),
                },
              ],
            };
          },
          experimental_transform: [markdownJoinerTransform()],
          experimental_context: this.toolContext,
          onError: ({ error }) => {
            const errorText =
              error instanceof Error ? error.message : String(error);

            writer.write({
              type: "error",
              errorText,
            });

            this.toolContext.sdk.window.showToast(
              "[Shift Agents] Error: " + errorText,
              {
                variant: "error",
              },
            );
          },
        });

        writer.merge(
          result.toUIMessageStream({
            messageMetadata: ({ part }) => {
              if (part.type === "start") {
                return {
                  state: "streaming",
                };
              }

              if (part.type === "finish") {
                return {
                  state: "done",
                };
              }

              if (part.type === "error") {
                return {
                  state: "error",
                };
              }

              if (part.type === "abort") {
                return {
                  state: "abort",
                };
              }

              return {};
            },
            sendReasoning: true,
          }),
        );
      },
    });

    return stream;
  }

  // eslint-disable-next-line @typescript-eslint/no-restricted-types
  reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return Promise.resolve(null);
  }
}

function contextMessages({
  currentRequest,
  todoManager,
  learnings,
  environmentSummaries,
}: {
  currentRequest: ReplaySession;
  todoManager: TodoManager;
  learnings: string[];
  environmentSummaries: ReturnType<typeof summarizeAgentEnvironments>;
}): string {
  let contextContent =
    "This message gets automatically attached. Here is the current context about the environment and replay session:\n\n";

  contextContent += `<|current_request|>
    The HTTP request you are analyzing:
    <|active_entry_id|>${currentRequest.activeEntryId}</|active_entry_id|>
    <|raw|>${currentRequest.request.raw}</|raw|>
    <|host|>${currentRequest.request.host}</|host|>
    <|port|>${currentRequest.request.port}</|port|>
    </|current_request|>
    \n\n`;

  if (learnings.length > 0) {
    const serializedLearnings = JSON.stringify(
      learnings.map((value, index) => ({ index, value })),
      null,
      2,
    );
    contextContent += `<|learnings|>
    ${serializedLearnings}
    </|learnings|>
    \n\n`;
  }

  if (environmentSummaries.length > 0) {
    const serializedEnvironments = JSON.stringify(
      environmentSummaries.map((environment) => ({
        id: environment.id,
        name: environment.name,
        variableKeys: environment.variableKeys,
      })),
      null,
      2,
    );

    contextContent += `<|environments|>
    ${serializedEnvironments}
    </|environments|>
    \n\n`;
  }

  const allTodos = todoManager.getTodos();
  if (allTodos.length > 0) {
    const pendingTodos = allTodos.filter((todo) => todo.status === "pending");
    const completedTodos = allTodos.filter(
      (todo) => todo.status === "completed",
    );

    contextContent += `<todos> Current status of todos:`;
    if (completedTodos.length > 0) {
      contextContent += `
          Completed todos:
          ${completedTodos
            .map((todo) => `- [x] ${todo.content} (ID: ${todo.id})`)
            .join("\n")}`;
    }

    if (pendingTodos.length > 0) {
      contextContent += `
        Pending todos:
        ${pendingTodos
          .map(
            (todo) =>
              `- [ ] ${todo.content} (ID: ${todo.id})${
                isPresent(todo.internal_content)
                  ? ` - Internal content: \n"""\n${todo.internal_content}\n"""`
                  : ""
              }`,
          )
          .join("\n")}`;
    }

    contextContent += `
      You can mark pending todos as finished using the todo tool with their IDs.
      </todos>\n\n`;
  }
  return contextContent.trim();
}

function buildSystemPrompt(agentId: string, runtimeConfig: AgentRuntimeConfig) {
  const configStore = useConfigStore();
  const uiStore = useUIStore();

  const selectedPromptsIds = uiStore.getSelectedPrompts(agentId);

  const selectedPrompts = configStore.customPrompts.filter((prompt) => {
    if (!selectedPromptsIds.includes(prompt.id)) {
      return false;
    }
    return true;
  });

  const promptEntries: Array<{ id?: string; content: string }> = [];
  const seenIds = new Set<string>();

  const resolvePromptContent = (prompt: AgentPromptConfig): string => {
    const promptId = prompt.id;
    if (typeof promptId === "string" && promptId.length > 0) {
      seenIds.add(promptId);
    }

    const providedContent = prompt.content;
    if (
      typeof providedContent === "string" &&
      providedContent.trim().length > 0
    ) {
      return providedContent;
    }

    if (typeof promptId !== "string" || promptId.length === 0) {
      return "";
    }

    const fallback = configStore.customPrompts.find(
      (candidate) => candidate.id === promptId,
    );
    if (!fallback) {
      return "";
    }

    const projectSpecificContent = configStore.getProjectSpecificPrompt(
      fallback.id,
    );
    if (
      typeof projectSpecificContent === "string" &&
      projectSpecificContent.trim().length > 0
    ) {
      return `${fallback.content}\n\n${projectSpecificContent}`;
    }
    return fallback.content;
  };

  for (const prompt of selectedPrompts) {
    const promptId =
      typeof prompt.id === "string" && prompt.id.length > 0
        ? prompt.id
        : undefined;
    const promptContent =
      typeof prompt.content === "string" ? prompt.content : "";
    const projectSpecificContent =
      promptId !== undefined
        ? configStore.getProjectSpecificPrompt(promptId)
        : null;
    const fullContent =
      typeof projectSpecificContent === "string" &&
      projectSpecificContent.trim().length > 0
        ? `${promptContent}\n\n${projectSpecificContent}`
        : promptContent;
    promptEntries.push({ id: promptId, content: fullContent });
    if (promptId !== undefined) {
      seenIds.add(promptId);
    }
  }

  for (const configPrompt of runtimeConfig.customPrompts) {
    const promptId =
      typeof configPrompt.id === "string" && configPrompt.id.length > 0
        ? configPrompt.id
        : undefined;
    if (promptId !== undefined && seenIds.has(promptId)) {
      continue;
    }
    const content = resolvePromptContent(configPrompt);
    if (content.trim().length === 0) {
      continue;
    }

    promptEntries.push({
      id: configPrompt.id,
      content,
    });
  }

  if (runtimeConfig.selections.length > 0) {
    const formattedSelections = runtimeConfig.selections
      .map((entry, index) => {
        const comment = entry.comment;
        const commentLine =
          typeof comment === "string" && comment.trim().length > 0
            ? `Comment: ${comment.trim()}`
            : "Comment: (none)";
        return `Selection ${index + 1}:\n${entry.selection}\n${commentLine}`;
      })
      .join("\n\n");

    promptEntries.push({
      content: `User-provided selections to consider - YOU MUST use these to create a preliminary todo list:\n\n${formattedSelections}`,
    });
  }

  let prompt = `<system_prompt>${BASE_SYSTEM_PROMPT}</system_prompt>`;

  if (promptEntries.length > 0) {
    prompt += `\n<additional_instructions>\n`;
    prompt += promptEntries
      .map((entry) => `<prompt>${entry.content}</prompt>`)
      .join("\n");
    prompt += `\n</additional_instructions>`;
  }

  return prompt;
}
