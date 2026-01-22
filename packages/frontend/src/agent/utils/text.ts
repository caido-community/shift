import { Result } from "shared";

type ReplaceUniqueResult = {
  before: string;
  after: string;
};

export function replaceUniqueText(
  text: string,
  oldText: string,
  newText: string
): Result<ReplaceUniqueResult, string> {
  if (!text.includes(oldText)) {
    return Result.err("Text not found");
  }

  const occurrences = text.split(oldText).length - 1;
  if (occurrences > 1) {
    return Result.err(`Found ${occurrences} occurrences. Text must be unique.`);
  }

  const index = text.indexOf(oldText);
  const after = text.substring(0, index) + newText + text.substring(index + oldText.length);

  if (text === after) {
    return Result.err("No changes made");
  }

  return Result.ok({ before: text, after });
}
