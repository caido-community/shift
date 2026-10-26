import type { RequestDiffLine } from "shared";

const CAIDO_EDITOR_COLORS = {
  method: "#d2a8ff",
  version: "#48b685",
  statusCode: "#b5cea8",
  headerName: "#fec418",
};

const MARKER = /\[(\/?)HIGHLIGHT\]/;

type Range = { from: number; to: number };
type HttpSegment = { text: string; color: string | undefined; marked: boolean };
type HttpLine = Pick<RequestDiffLine, "text" | "line" | "head">;

export const getHeadLength = (lines: string[]) => {
  const blank = lines.indexOf("");
  return blank === -1 ? lines.length : blank;
};

function getColors({ text, line, head }: HttpLine): (Range & { color: string })[] {
  if (!head) return [];

  if (line > 1) {
    const colon = text.indexOf(":");
    return colon > 0 ? [{ from: 0, to: colon, color: CAIDO_EDITOR_COLORS.headerName }] : [];
  }

  const status = /^(HTTP\/[\d.]+) (\d{3})/.exec(text);
  if (status !== null) {
    const versionEnd = status[1]!.length;
    return [
      { from: 0, to: versionEnd, color: CAIDO_EDITOR_COLORS.version },
      { from: versionEnd + 1, to: status[0].length, color: CAIDO_EDITOR_COLORS.statusCode },
    ];
  }

  const method = /^\S+/.exec(text)?.[0] ?? "";
  const version = /HTTP\/[\d.]+$/.exec(text)?.[0] ?? "";
  return [
    { from: 0, to: method.length, color: CAIDO_EDITOR_COLORS.method },
    { from: text.length - version.length, to: text.length, color: CAIDO_EDITOR_COLORS.version },
  ];
}

export function toHttpSegments(line: HttpLine, marks: Range[]): HttpSegment[] {
  const colors = getColors(line);
  const segments: HttpSegment[] = [];
  for (let i = 0; i < line.text.length; i++) {
    const color = colors.find((range) => i >= range.from && i < range.to)?.color;
    const marked = marks.some((range) => i >= range.from && i < range.to);
    const last = segments.at(-1);
    if (last !== undefined && last.color === color && last.marked === marked) {
      last.text += line.text[i];
    } else {
      segments.push({ text: line.text[i]!, color, marked });
    }
  }
  return segments;
}

export function toHttpBlockLines(source: string): HttpSegment[][] {
  let isMarked = false;
  const lines = source.split("\n").map((raw) => {
    let text = "";
    const marks: Range[] = [];
    // split() puts the captured slash of each marker at the odd indexes.
    raw.split(MARKER).forEach((piece, index) => {
      if (index % 2 === 1) {
        isMarked = piece === "";
        return;
      }
      if (isMarked) marks.push({ from: text.length, to: text.length + piece.length });
      text += piece;
    });
    return { text, marks };
  });

  const headLength = getHeadLength(lines.map((line) => line.text));
  return lines.map(({ text, marks }, index) =>
    toHttpSegments({ text, line: index + 1, head: index < headLength }, marks)
  );
}
