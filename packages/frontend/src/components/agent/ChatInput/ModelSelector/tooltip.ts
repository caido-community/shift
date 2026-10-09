const surface = (shade: number) => `hsl(var(--c-surface-${shade}))`;

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const line = (text: string, shade: number) =>
  `<div style="color:${surface(shade)}">${escapeHtml(text)}</div>`;

const textStyle = {
  background: surface(800),
  border: `1px solid ${surface(700)}`,
  borderRadius: "8px",
  padding: "6px 10px",
  fontSize: "12px",
  lineHeight: "1.45",
  maxWidth: "240px",
  whiteSpace: "normal",
  boxShadow: "0 6px 16px rgb(0 0 0 / 0.35)",
};

export function hint(title: string, detail?: string) {
  return {
    value: line(title, 0) + (detail === undefined ? "" : line(detail, 400)),
    escape: false,
    pt: {
      arrow: { style: { display: "none" } },
      text: { style: textStyle },
    },
  };
}
