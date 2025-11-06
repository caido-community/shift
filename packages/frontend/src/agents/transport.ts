import { createOpenRouter } from "@openrouter/ai-sdk-provider";
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
  addFindingTool,
  addTodoTool,
  grepResponseTool,
  removeRequestHeaderTool,
  removeRequestQueryTool,
  replaceRequestTextTool,
  runJavaScriptTool,
  sendRequestTool,
  setRequestBodyTool,
  setRequestHeaderTool,
  setRequestMethodTool,
  setRequestPathTool,
  setRequestQueryTool,
  setRequestRawTool,
  updateTodoTool,
} from "@/agents/tools";
import {
  type CustomUIMessage,
  type ReplaySession,
  type ToolContext,
} from "@/agents/types";
import { markdownJoinerTransform } from "@/agents/utils/markdownJoiner";
import { useConfigStore } from "@/stores/config";
import { useUIStore } from "@/stores/ui";
import { getReplaySession, isPresent } from "@/utils";

export class ClientSideChatTransport implements ChatTransport<UIMessage> {
  constructor(private toolContext: ToolContext) {}

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

    const currentRequest = this.toolContext.replaySession.request;
    currentRequest.raw = initialSession.session.request.raw;
    currentRequest.host = initialSession.session.request.host;
    currentRequest.port = initialSession.session.request.port;
    currentRequest.isTLS = initialSession.session.request.isTLS;
    currentRequest.SNI = initialSession.session.request.SNI;

    const prompt = convertToModelMessages(messages);
    const configStore = useConfigStore();

    const openrouter = createOpenRouter({
      apiKey: configStore.openRouterApiKey,
      extraBody: {
        parallel_tool_calls: false,
        reasoning: {
          max_tokens: configStore.reasoningConfig.max_tokens,
          enabled: configStore.reasoningConfig.enabled,
        },
      },
    });

    const model = openrouter(configStore.agentsModel);
    const stream = createUIMessageStream<CustomUIMessage>({
      execute: ({ writer }) => {
        const result = streamText({
          model,
          system: buildSystemPrompt(this.toolContext.replaySession.id),
          messages: prompt,
          abortSignal: abortSignal,
          stopWhen: stepCountIs(configStore.maxIterations),
          tools: {
            sendRequest: sendRequestTool,
            updateTodo: updateTodoTool,
            setRequestRaw: setRequestRawTool,
            setRequestQuery: setRequestQueryTool,
            setRequestPath: setRequestPathTool,
            setRequestMethod: setRequestMethodTool,
            setRequestHeader: setRequestHeaderTool,
            setRequestBody: setRequestBodyTool,
            runJavaScript: runJavaScriptTool,
            replaceRequestText: replaceRequestTextTool,
            removeRequestQuery: removeRequestQueryTool,
            removeRequestHeader: removeRequestHeaderTool,
            grepResponse: grepResponseTool,
            addTodo: addTodoTool,
            addFinding: addFindingTool,
          },
          onFinish: () => {
            this.toolContext.todoManager.clearTodos();
          },
          prepareStep: (step) => {
            return {
              messages: [
                ...step.messages,
                {
                  role: "user",
                  content: contextMessages({
                    currentRequest: this.toolContext.replaySession,
                    todoManager: this.toolContext.todoManager,
                    memory: configStore.memory,
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

            // TODO: Temporary workaround for abort error, seems to be a bug in the ai-sdk
            if (errorText.includes("abort")) {
              return;
            }

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
  memory,
}: {
  currentRequest: ReplaySession;
  todoManager: TodoManager;
  memory: string;
}): string {
  let contextContent =
    "This message gets automatically attached. Here is the current context about the environment and replay session:\n\n";

  contextContent += `<|current_request|>
    The HTTP request you are analyzing:
    <|raw|>${currentRequest.request.raw}</|raw|>
    <|host|>${currentRequest.request.host}</|host|>
    <|port|>${currentRequest.request.port}</|port|>
    </|current_request|>
    \n\n`;

  if (memory.trim()) {
    contextContent += `<|memory|>
    ${memory.trim()}
    </|memory|>
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

function buildSystemPrompt(agentId: string) {
  const configStore = useConfigStore();
  const uiStore = useUIStore();

  const selectedPromptsIds = uiStore.getSelectedPrompts(agentId);

  const selectedPrompts = configStore.customPrompts.filter((prompt) =>
    selectedPromptsIds.includes(prompt.id),
  );

  let prompt = `<system_prompt>${BASE_SYSTEM_PROMPT}</system_prompt>`;

  if (selectedPrompts.length > 0) {
    prompt += `\n<additional_instructions>\n`;
    prompt += selectedPrompts
      .map((prompt) => {
        const projectSpecificContent = configStore.getProjectSpecificPrompt(
          prompt.id,
        );
        const fullContent = projectSpecificContent
          ? `${prompt.content}\n\n${projectSpecificContent}`
          : prompt.content;
        return `<prompt>${fullContent}</prompt>`;
      })
      .join("\n");
    prompt += `\n</additional_instructions>`;
  }

  return prompt;
}
