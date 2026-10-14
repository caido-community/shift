import type { RequestDiff, RequestDiffLine } from "shared";

import { getHeadLength } from "./httpBlock";

const MAX_LINES = 30;
const MAX_LINE_LENGTH = 300;
const MAX_LCS_CELLS = 40_000;

type Hunk = { dels: RequestDiffLine[]; adds: RequestDiffLine[] };

function countCommonEnds(a: ArrayLike<string>, b: ArrayLike<string>) {
  const max = Math.min(a.length, b.length);
  let prefix = 0;
  while (prefix < max && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) suffix++;
  return { prefix, suffix };
}

function toLines(texts: string[], op: RequestDiffLine["op"]): RequestDiffLine[] {
  const headLength = getHeadLength(texts);
  return texts.map((text, index) => ({ op, line: index + 1, text, head: index < headLength }));
}

function toHunks(dels: RequestDiffLine[], adds: RequestDiffLine[]): Hunk[] {
  if (dels.length * adds.length > MAX_LCS_CELLS) return [{ dels, adds }];

  const width = adds.length + 1;
  const table = new Uint16Array((dels.length + 1) * width);
  const lcs = (i: number, j: number) => table[i * width + j]!;
  for (let i = dels.length - 1; i >= 0; i--) {
    for (let j = adds.length - 1; j >= 0; j--) {
      table[i * width + j] =
        dels[i]!.text === adds[j]!.text
          ? lcs(i + 1, j + 1) + 1
          : Math.max(lcs(i + 1, j), lcs(i, j + 1));
    }
  }

  const hunks: Hunk[] = [{ dels: [], adds: [] }];
  let i = 0;
  let j = 0;
  while (i < dels.length || j < adds.length) {
    const del = dels[i];
    const add = adds[j];
    const hunk = hunks.at(-1)!;
    if (del !== undefined && add !== undefined && del.text === add.text) {
      hunks.push({ dels: [], adds: [] });
      i++;
      j++;
    } else if (del !== undefined && (add === undefined || lcs(i + 1, j) >= lcs(i, j + 1))) {
      hunk.dels.push(del);
      i++;
    } else if (add !== undefined) {
      hunk.adds.push(add);
      j++;
    }
  }
  return hunks;
}

function markChange(line: RequestDiffLine, counterpart: RequestDiffLine | undefined) {
  if (counterpart === undefined) return line;
  const { prefix, suffix } = countCommonEnds(line.text, counterpart.text);
  const hasNothingInCommon = prefix + suffix === 0;
  if (hasNothingInCommon) return line;
  return { ...line, changedRange: { from: prefix, to: line.text.length - suffix } };
}

function toChangedLines({ dels, adds }: Hunk): RequestDiffLine[] {
  return [
    ...dels.map((line, index) => markChange(line, adds[index])),
    ...adds.map((line, index) => markChange(line, dels[index])),
  ];
}

export function computeRequestDiff(before: string, after: string): RequestDiff | undefined {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const { prefix, suffix } = countCommonEnds(a, b);
  const changed = toHunks(
    toLines(a, "del").slice(prefix, a.length - suffix),
    toLines(b, "add").slice(prefix, b.length - suffix)
  ).flatMap(toChangedLines);
  if (changed.length === 0) return undefined;

  const lines = changed.slice(0, MAX_LINES).map((line) => ({
    ...line,
    text:
      line.text.length > MAX_LINE_LENGTH ? `${line.text.slice(0, MAX_LINE_LENGTH)}…` : line.text,
  }));
  return { lines, omittedLines: changed.length - lines.length };
}
