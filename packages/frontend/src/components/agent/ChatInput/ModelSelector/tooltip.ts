// Tooltips render under document.body, outside the plugin's scoped Tailwind,
// so the compact look is inline styles over Caido's theme variables.
const surface = (shade: number) => `hsl(var(--c-surface-${shade}))`;

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function hint(title: string, detail?: string) {
  return {
    value:
      `<div style="color:${surface(0)}">${escapeHtml(title)}</div>` +
      (detail === undefined
        ? ""
        : `<div style="color:${surface(400)}">${escapeHtml(detail)}</div>`),
    escape: false,
    pt: {
      arrow: { style: { display: "none" } },
      text: {
        style: {
          background: surface(800),
          border: `1px solid ${surface(700)}`,
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "12px",
          lineHeight: "1.45",
          maxWidth: "240px",
          whiteSpace: "normal",
          boxShadow: "0 6px 16px rgb(0 0 0 / 0.35)",
        },
      },
    },
  };
}
