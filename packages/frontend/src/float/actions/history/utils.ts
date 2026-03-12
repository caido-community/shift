export const truncateMiddle = (
  value: string,
  maxLength: number,
  marker: string
): { value: string; omittedCharacters: number } => {
  if (value.length <= maxLength) {
    return { value, omittedCharacters: 0 };
  }

  if (maxLength <= marker.length + 2) {
    return {
      value: value.slice(0, maxLength),
      omittedCharacters: value.length - maxLength,
    };
  }

  const remaining = maxLength - marker.length;
  const headLength = Math.ceil(remaining / 2);
  const tailLength = Math.max(0, remaining - headLength);

  return {
    value: `${value.slice(0, headLength)}${marker}${value.slice(value.length - tailLength)}`,
    omittedCharacters: value.length - headLength - tailLength,
  };
};
