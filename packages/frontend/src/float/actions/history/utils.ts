type TruncatedValue = {
  value: string;
  truncated: boolean;
  truncatedCharacters: number | undefined;
};

export const truncateMiddle = (
  value: string,
  maxLength: number,
  buildMarker: (omittedCharacters: number) => string
): TruncatedValue => {
  if (value.length <= maxLength) {
    return { value, truncated: false, truncatedCharacters: undefined };
  }

  // The marker length depends on the omitted count, so measure once with an estimate.
  const estimate = cut(value, maxLength, buildMarker(value.length - maxLength));
  const { result, omittedCharacters } = cut(
    value,
    maxLength,
    buildMarker(estimate.omittedCharacters)
  );
  return { value: result, truncated: true, truncatedCharacters: omittedCharacters };
};

const cut = (value: string, maxLength: number, marker: string) => {
  if (maxLength <= marker.length + 2) {
    return { result: value.slice(0, maxLength), omittedCharacters: value.length - maxLength };
  }

  const remaining = maxLength - marker.length;
  const headLength = Math.ceil(remaining / 2);
  const tailLength = remaining - headLength;
  return {
    result: `${value.slice(0, headLength)}${marker}${value.slice(value.length - tailLength)}`,
    omittedCharacters: value.length - headLength - tailLength,
  };
};
