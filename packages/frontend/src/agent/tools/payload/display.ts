import { isPresent } from "../../../utils/optional";

type PayloadBlobCreateDisplayInput = {
  reason: string;
  jsScript: string;
};

type PayloadBlobCreateDisplayOutput = {
  reason: string;
  blobId: string;
  length: number;
  preview: string;
};

export function getPayloadBlobCreateStreamingMessage(
  input: PayloadBlobCreateDisplayInput | undefined
) {
  if (isPresent(input?.reason)) {
    return [{ text: input.reason }];
  }

  return input
    ? [{ text: "Generating payload blob from " }, { text: "JavaScript", muted: true }]
    : [{ text: "Generating " }, { text: "payload blob", muted: true }];
}

export function getPayloadBlobCreateSuccessMessage(args: {
  input: PayloadBlobCreateDisplayInput | undefined;
  output: PayloadBlobCreateDisplayOutput | undefined;
}) {
  const { input, output } = args;
  const reason = output?.reason ?? input?.reason;
  if (isPresent(reason)) {
    return [{ text: reason }];
  }

  if (!isPresent(output)) {
    return [{ text: "Created " }, { text: "payload blob", muted: true }];
  }

  return [{ text: "Created payload blob " }, { text: output.blobId, muted: true }];
}
