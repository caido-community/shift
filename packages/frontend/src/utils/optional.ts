// eslint-disable-next-line @typescript-eslint/no-restricted-types
type UndefinedOrNull = null | undefined;

export type Maybe<T> = T | UndefinedOrNull;

export const isAbsent = <T>(
  argument: T | UndefinedOrNull,
): argument is UndefinedOrNull => {
  return argument === undefined || argument === null;
};

export const isPresent = <T>(
  argument: T | UndefinedOrNull,
): argument is NonNullable<T> => {
  return argument !== undefined && argument !== null;
};
