import { type EditorView } from "@codemirror/view";

import { type ActionResult } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { showConfirmationDialog } from "@/utils";

const UNKNOWN_ERROR_FALLBACK = "Unknown error";

type ActiveEditor = NonNullable<
  ReturnType<FrontendSDK["window"]["getActiveEditor"]>
>;

type EnvironmentResult = Awaited<
  ReturnType<FrontendSDK["graphql"]["environment"]>
>;

type EnvironmentContextResult = Awaited<
  ReturnType<FrontendSDK["graphql"]["environmentContext"]>
>;

type Environment =
  EnvironmentResult extends { environment?: infer T }
    ? NonNullable<T>
    : never;

type EnvironmentVariable =
  Environment extends {
    variables?: infer V;
  }
    ? V extends Array<infer P>
      ? P
      : { name: string; value: string; kind?: string | null }
    : { name: string; value: string; kind?: string | null };

type EnvironmentVariableKindValue =
  EnvironmentVariable extends { kind?: infer K }
    ? NonNullable<K>
    : string;

export type NormalizedEnvironmentVariable = {
  name: string;
  value: string;
  kind: EnvironmentVariableKindValue;
};

type HostedFileDialogOptions = {
  fileName: string;
  content: string;
  successToast?: string;
  errorToast?: string;
};

export const noActiveEditorViewResult: ActionResult = {
  success: false,
  error: "No active editor view found",
};

export const noActiveEditorResult: ActionResult = {
  success: false,
  error: "No active editor found",
};

export const withActiveEditorView = (
  sdk: FrontendSDK,
  handler: (view: EditorView) => ActionResult,
): ActionResult => {
  const view = sdk.window.getActiveEditor()?.getEditorView();

  if (view === undefined) {
    return noActiveEditorViewResult;
  }

  return handler(view);
};

export const withActiveEditor = (
  sdk: FrontendSDK,
  handler: (editor: ActiveEditor) => ActionResult,
): ActionResult => {
  const editor = sdk.window.getActiveEditor();

  if (editor === undefined) {
    return noActiveEditorResult;
  }

  return handler(editor);
};

export const replaceEditorContent = (
  view: EditorView,
  content: string,
): void => {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: content },
  });
  view.focus();
};

export const unknownErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : UNKNOWN_ERROR_FALLBACK;

export const actionSuccess = (message: string): ActionResult => ({
  success: true,
  frontend_message: message,
});

export const actionError = (prefix: string, error: unknown): ActionResult => ({
  success: false,
  error: `${prefix}: ${unknownErrorMessage(error)}`,
});

export const runAction = async (
  handler: () => Promise<void>,
  successMessage: string,
  errorPrefix: string,
): Promise<ActionResult> => {
  try {
    await handler();
    return actionSuccess(successMessage);
  } catch (error) {
    return actionError(errorPrefix, error);
  }
};

export const resolveEnvironment = async (
  sdk: FrontendSDK,
  environmentId?: string,
): Promise<Environment | null> => {
  const fetchEnvironment = async (id: string): Promise<Environment | null> => {
    const environmentResult = await sdk.graphql.environment({ id });
    return environmentResult?.environment ?? null;
  };

  if (environmentId !== undefined && environmentId.length > 0) {
    return fetchEnvironment(environmentId);
  }

  const contextResult =
    (await sdk.graphql.environmentContext()) as EnvironmentContextResult;
  const contextEnvironment =
    contextResult?.environmentContext?.selected ??
    contextResult?.environmentContext?.global;

  if (
    contextEnvironment === undefined ||
    contextEnvironment === null ||
    contextEnvironment.id === undefined
  ) {
    return null;
  }

  return fetchEnvironment(contextEnvironment.id);
};

export const normalizeEnvironmentVariable = (
  variable: Pick<EnvironmentVariable, "name" | "value"> & {
    kind?: EnvironmentVariableKindValue | string | null;
  },
): NormalizedEnvironmentVariable => ({
  name: variable.name,
  value: variable.value,
  kind: (variable.kind ?? "PLAIN") as EnvironmentVariableKindValue,
});

export const hostedFileConfirmation = (
  sdk: FrontendSDK,
  options: HostedFileDialogOptions,
): void => {
  const dialog = showConfirmationDialog(sdk, {
    fileName: options.fileName,
    content: options.content,
    onConfirm: async (updatedContent) => {
      dialog.close();

      try {
        console.log("passed into file", [updatedContent]);
        const file = new File([updatedContent], options.fileName);
        const result = await sdk.files.create(file);

        if (result === undefined) {
          sdk.window.showToast(options.errorToast ?? "Failed to create file", {
            variant: "error",
          });
          return;
        }

        sdk.window.showToast(
          options.successToast ?? "File created successfully",
          {
            variant: "success",
          },
        );
      } catch (error) {
        sdk.window.showToast(options.errorToast ?? "Failed to create file", {
          variant: "error",
        });
      }
    },
  });
};
