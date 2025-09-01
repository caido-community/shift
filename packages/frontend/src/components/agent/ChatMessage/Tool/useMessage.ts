import { computed, ref, type Ref } from "vue";

import type { MessageState } from "@/agents/types";
import { useAgentsStore } from "@/stores/agents";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";

export const useToolMessage = (params: {
  toolName: Ref<string>;
  state: Ref<ToolState>;
  output: Ref<unknown>;
  messageState: Ref<MessageState | undefined>;
}) => {
  const { toolName, state, output, messageState } = params;

  const agentsStore = useAgentsStore();
  const showDetails = ref(false);

  const isProcessing = computed(() => {
    const isActiveState =
      state.value === "input-streaming" || state.value === "input-available";
    if (messageState.value === "abort") return false;
    return isActiveState && agentsStore.selectedAgent?.status === "streaming";
  });

  const TOOL_UI: Record<string, { successLabel: string; successIcon: string }> =
    {
      sendRequest: {
        successLabel: "Sent the request",
        successIcon: "fas fa-terminal",
      },
      setRequestHeader: {
        successLabel: "Updated request header",
        successIcon: "fas fa-edit",
      },
      removeRequestHeader: {
        successLabel: "Removed request header",
        successIcon: "fas fa-edit",
      },
      setRequestQuery: {
        successLabel: "Updated query parameter",
        successIcon: "fas fa-edit",
      },
      removeRequestQuery: {
        successLabel: "Removed query parameter",
        successIcon: "fas fa-edit",
      },
      setRequestMethod: {
        successLabel: "Changed request method",
        successIcon: "fas fa-edit",
      },
      setRequestPath: {
        successLabel: "Changed request path",
        successIcon: "fas fa-edit",
      },
      setRequestBody: {
        successLabel: "Updated request body",
        successIcon: "fas fa-edit",
      },
      setRequestRaw: {
        successLabel: "Updated raw request",
        successIcon: "fas fa-edit",
      },
      replaceRequestText: {
        successLabel: "Replaced text in request",
        successIcon: "fas fa-edit",
      },
      runJavaScript: {
        successLabel: "Executed JavaScript",
        successIcon: "fas fa-code",
      },
      grepResponse: {
        successLabel: "Grepped through response",
        successIcon: "fas fa-search",
      },
      addTodo: { successLabel: "Added a todo", successIcon: "fas fa-tasks" },
      updateTodo: {
        successLabel: "Updated a todo",
        successIcon: "fas fa-tasks",
      },
      addFinding: {
        successLabel: "Added a finding",
        successIcon: "fas fa-flag",
      },
    };

  const toolIcon = computed(() => {
    if (
      messageState.value === "abort" &&
      (state.value === "input-streaming" || state.value === "input-available")
    ) {
      return "fas fa-exclamation-triangle";
    }

    switch (state.value) {
      case "input-streaming":
        return "fas fa-spinner fa-spin";
      case "input-available":
        return "fas fa-spinner fa-spin";
      case "output-available":
        return TOOL_UI[toolName.value]?.successIcon ?? "fas fa-check";
      case "output-error":
        return "fas fa-exclamation-triangle";
      default:
        return "fas fa-cog";
    }
  });

  const formatToolCall = computed(() => {
    if (
      messageState.value === "abort" &&
      (state.value === "input-streaming" || state.value === "input-available")
    ) {
      return `Aborted ${toolName.value}`;
    }
    if (state.value === "input-streaming") {
      return `Preparing ${toolName.value}...`;
    }
    if (state.value === "input-available") {
      return `Processing ${toolName.value}...`;
    }
    if (state.value === "output-error") {
      return `Failed ${toolName.value}`;
    }

    const name = toolName.value;
    return TOOL_UI[name]?.successLabel ?? `Completed ${name}`;
  });

  const toolDetails = computed(() => {
    if (output.value === undefined) return undefined;
    return JSON.stringify(output.value, null, 2);
  });

  const toggleDetails = () => {
    if (toolDetails.value !== undefined) {
      showDetails.value = !showDetails.value;
    }
  };

  return {
    isProcessing,
    toolIcon,
    formatToolCall,
    toolDetails,
    showDetails,
    toggleDetails,
  };
};
