// eslint-disable-next-line @typescript-eslint/no-restricted-types
export type UndefinedOrNull = null | undefined;

export const isPresent = <T>(argument: T | UndefinedOrNull): argument is NonNullable<T> => {
  return argument !== undefined && argument !== null;
};

export const pluralize = (count: number, singular: string, plural?: string): string => {
  return count === 1 ? singular : (plural ?? `${singular}s`);
};
