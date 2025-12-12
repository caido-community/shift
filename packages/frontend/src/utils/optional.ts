// eslint-disable-next-line @typescript-eslint/no-restricted-types
type UndefinedOrNull = null | undefined;

export const isPresent = <T>(
  argument: T | UndefinedOrNull,
): argument is NonNullable<T> => {
  return argument !== undefined && argument !== null;
};
