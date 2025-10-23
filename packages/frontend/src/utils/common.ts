import { ConfirmationDialog } from "@/components/confirmation";
import { type FrontendSDK } from "@/types";

export const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const showConfirmationDialog = (
  sdk: FrontendSDK,
  {
    fileName,
    content,
    onConfirm,
  }: {
    fileName: string;
    content: string;
    onConfirm: (content: string) => void;
  },
) => {
  const dialog = sdk.window.showDialog(
    {
      component: ConfirmationDialog,
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
    },
  );

  return dialog;
};