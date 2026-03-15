export const generateID = (prefix: string = ""): string => {
  return prefix + Math.random().toString(36).substring(2, 15);
};

export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};
