import {
  type EnvironmentFullFragment,
  type EnvironmentVariableInput,
  type EnvironmentVariableKind,
} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";
import { type Editor } from "@caido/sdk-frontend/src/types/types/editor";
import { type EditorView } from "@codemirror/view";

import { ConfirmationDialog } from "@/components/confirmation";
import { ActionResult, type ActionResult as ActionResultType } from "@/float/types";
import { type FrontendSDK } from "@/types";
import { isPresent } from "@/utils/optional";

type HostedFileDialogOptions = {
  fileName: string;
  content: string;
};

type EditorContext = {
  view: EditorView;
  update: (content: string) => void;
};

export const withActiveEditorView = (
  sdk: FrontendSDK,
  handler: (context: EditorContext) => ActionResultType | Promise<ActionResultType>
): ActionResultType | Promise<ActionResultType> => {
  const editor = sdk.window.getActiveEditor();

  if (!isPresent(editor)) {
    return ActionResult.err("No active editor view found");
  }

  const view = editor.getEditorView();
  if (!isPresent(view)) {
    return ActionResult.err("No active editor view found");
  }

  const update = (content: string): void => {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
    });
    view.focus();
  };

  return handler({ view, update });
};

export const withActiveEditor = (
  sdk: FrontendSDK,
  handler: (editor: Editor) => ActionResultType
): ActionResultType => {
  const editor = sdk.window.getActiveEditor();

  if (!isPresent(editor)) {
    return ActionResult.err("No active editor found");
  }

  return handler(editor);
};

export const resolveEnvironment = async (
  sdk: FrontendSDK,
  environmentId?: string
): Promise<EnvironmentFullFragment | undefined> => {
  const fetchEnvironment = async (id: string): Promise<EnvironmentFullFragment | undefined> => {
    const environmentResult = await sdk.graphql.environment({ id });
    return environmentResult?.environment ?? undefined;
  };

  if (isPresent(environmentId) && environmentId.length > 0) {
    return fetchEnvironment(environmentId);
  }

  const contextResult = await sdk.graphql.environmentContext();
  const contextEnvironment =
    contextResult?.environmentContext?.selected ?? contextResult?.environmentContext?.global;

  if (!isPresent(contextEnvironment) || !isPresent(contextEnvironment.id)) {
    return undefined;
  }

  return fetchEnvironment(contextEnvironment.id);
};

export const normalizeEnvironmentVariable = (
  variable: Pick<EnvironmentVariableInput, "name" | "value"> & {
    kind?: EnvironmentVariableKind;
  }
): EnvironmentVariableInput => ({
  name: variable.name,
  value: variable.value,
  kind: variable.kind ?? "PLAIN",
});

export const hostedFileConfirmation = (
  sdk: FrontendSDK,
  options: HostedFileDialogOptions
): void => {
  const dialog = showConfirmationDialog(sdk, {
    fileName: options.fileName,
    content: options.content,
    onConfirm: async (updatedContent) => {
      dialog.close();

      try {
        const file = new File([updatedContent], options.fileName);
        const result = await sdk.files.create(file);

        if (!isPresent(result)) {
          sdk.window.showToast("Failed to create file", {
            variant: "error",
          });
          return;
        }

        sdk.window.showToast("File created successfully", {
          variant: "success",
        });
      } catch (error) {
        sdk.window.showToast("Failed to create file", {
          variant: "error",
        });
      }
    },
  });
};

const showConfirmationDialog = (
  sdk: FrontendSDK,
  {
    fileName,
    content,
    onConfirm,
  }: {
    fileName: string;
    content: string;
    onConfirm: (content: string) => void;
  }
) => {
  const dialog = sdk.window.showDialog(
    {
      component: ConfirmationDialog as never,
      props: {
        fileName,
        content,
        onConfirm: () => onConfirm,
      },
    },
    {
      title: `Confirmation for file: ${fileName}`,
      closeOnEscape: true,
      closable: true,
      modal: true,
      position: "center",
    }
  );

  return dialog;
};
