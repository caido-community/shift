import { type BackgroundAgentLogPart, getCompletedToolDisplayName, plainParts } from "./logs";

type Args = Record<string, unknown>;

type ToolDisplayFn = (input: Args, output: unknown) => BackgroundAgentLogPart[];

type ActionOkOutput = {
  kind?: string;
  value?: {
    message?: string;
    totalReturned?: number;
  };
};

const str = (val: unknown): string => {
  if (typeof val === "string") {
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean" || typeof val === "bigint") {
    return String(val);
  }
  return "";
};

const truncate = (val: string, max: number): string =>
  val.length > max ? `${val.slice(0, max)}…` : val;

const displays: Record<string, ToolDisplayFn> = {
  historyRead: (_input, output) => {
    const result = output as ActionOkOutput;
    const count = result.value?.totalReturned;
    if (typeof count === "number") {
      return [
        { text: "Read ", muted: false },
        { text: String(count), muted: true },
        { text: " history entries", muted: false },
      ];
    }
    return plainParts(result.value?.message ?? "Read history");
  },

  historyRequestResponseRead: (input) => {
    const ids = input.requestIds as string[] | undefined;
    const rowIds = input.rowIds as string[] | undefined;
    const label = ids?.[0] ?? rowIds?.[0];
    if (typeof label === "string") {
      return [
        { text: "Read request/response ", muted: false },
        { text: label, muted: true },
      ];
    }
    return plainParts("Read request/response");
  },

  HistoryRowHighlight: (input) => {
    const color = str(input.color);
    const ids = Array.isArray(input.metadataIds)
      ? input.metadataIds.filter((value): value is string => typeof value === "string")
      : [];
    const label = typeof input.metadataId === "string" ? input.metadataId : ids[0];
    const count = label === undefined ? 0 : Math.max(ids.length, 1);
    if (color === "none") {
      if (count > 1) {
        return [
          { text: "Cleared highlight for ", muted: false },
          { text: `${count} rows`, muted: true },
        ];
      }
      return [
        { text: "Cleared highlight for row ", muted: false },
        { text: str(label), muted: true },
      ];
    }
    if (count > 1) {
      return [
        { text: "Set ", muted: false },
        { text: color, muted: true },
        { text: " highlight for ", muted: false },
        { text: `${count} rows`, muted: true },
      ];
    }
    return [
      { text: "Set ", muted: false },
      { text: color, muted: true },
      { text: " highlight for row ", muted: false },
      { text: str(label), muted: true },
    ];
  },

  httpqlQuerySet: (input) => [
    { text: "Set HTTPQL query ", muted: false },
    { text: truncate(str(input.query), 40), muted: true },
  ],

  editorMethodSet: (input) => [
    { text: "Set method to ", muted: false },
    { text: str(input.method), muted: true },
  ],

  editorPathSet: (input) => [
    { text: "Set path to ", muted: false },
    { text: truncate(str(input.path), 50), muted: true },
  ],

  editorHeaderAdd: (input) => {
    const header = str(input.header);
    const name = header.split(":")[0]?.trim() ?? header;
    return [
      { text: "Added header ", muted: false },
      { text: name, muted: true },
    ];
  },

  editorHeaderSet: (input) => {
    const header = str(input.header);
    const name = header.split(":")[0]?.trim() ?? header;
    return [
      { text: "Set header ", muted: false },
      { text: name, muted: true },
    ];
  },

  editorHeaderRemove: (input) => [
    { text: "Removed header ", muted: false },
    { text: str(input.name), muted: true },
  ],

  editorQueryAdd: (input) => [
    { text: "Added query param ", muted: false },
    { text: str(input.name), muted: true },
  ],

  editorQuerySet: (input) => [
    { text: "Set query param ", muted: false },
    { text: str(input.name), muted: true },
  ],

  editorQueryRemove: (input) => [
    { text: "Removed query param ", muted: false },
    { text: str(input.name), muted: true },
  ],

  navigate: (input) => [
    { text: "Navigated to ", muted: false },
    { text: str(input.path), muted: true },
  ],

  filterAdd: (input) => [
    { text: "Added filter ", muted: false },
    { text: str(input.filterName), muted: true },
  ],

  filterUpdate: (input) => [
    { text: "Updated filter ", muted: false },
    { text: str(input.filterName), muted: true },
  ],

  filterDelete: (input) => [
    { text: "Deleted filter ", muted: false },
    { text: str(input.filterName), muted: true },
  ],

  scopeAdd: (input) => [
    { text: "Added scope ", muted: false },
    { text: str(input.scopeName), muted: true },
  ],

  scopeUpdate: (input) => [
    { text: "Updated scope ", muted: false },
    { text: str(input.scopeName), muted: true },
  ],

  scopeDelete: (input) => [
    { text: "Deleted scope ", muted: false },
    { text: str(input.scopeName), muted: true },
  ],

  findingCreate: (input) => [
    { text: "Created finding ", muted: false },
    { text: truncate(str(input.title), 40), muted: true },
  ],

  replayTabSend: () => plainParts("Sent request"),

  replaySessionCreate: () => plainParts("Created replay session"),

  automateSessionCreate: () => plainParts("Created automate session"),

  matchReplaceAdd: () => plainParts("Added match & replace rule"),

  environmentCreate: (input) => [
    { text: "Created environment ", muted: false },
    { text: str(input.name), muted: true },
  ],

  environmentDelete: (input) => [
    { text: "Deleted environment ", muted: false },
    { text: str(input.name), muted: true },
  ],

  replayTabRename: (input) => [
    { text: "Renamed tab to ", muted: false },
    { text: str(input.name), muted: true },
  ],
};

export const getToolDisplayParts = (
  toolName: string,
  input: Args,
  output: unknown
): BackgroundAgentLogPart[] | undefined => {
  const fn = displays[toolName];
  if (fn === undefined) {
    return undefined;
  }
  return fn(input, output);
};

export const fallbackToolParts = (
  toolName: string,
  successMessage: string | undefined
): BackgroundAgentLogPart[] => {
  if (successMessage !== undefined) {
    return plainParts(successMessage);
  }
  return plainParts(getCompletedToolDisplayName(toolName));
};
