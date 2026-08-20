import { TUI_VIEW_IDS, type TuiTone, type TuiViewModel } from "./schemas.js";

const COLORS: Record<TuiTone | "heading" | "reset", string> = {
  neutral: "\u001b[37m",
  positive: "\u001b[32m",
  warning: "\u001b[33m",
  negative: "\u001b[31m",
  muted: "\u001b[90m",
  heading: "\u001b[1;36m",
  reset: "\u001b[0m",
};

export interface RenderTuiOptions {
  projectName: string;
  width?: number;
  color?: boolean;
  notice?: string;
}

function truncate(value: string, width: number): string {
  if (value.length <= width) return value;
  if (width <= 1) return "…";
  return `${value.slice(0, width - 1)}…`;
}

function paint(
  value: string,
  tone: TuiTone | "heading",
  color: boolean,
): string {
  return color ? `${COLORS[tone]}${value}${COLORS.reset}` : value;
}

export function renderTuiView(
  view: TuiViewModel,
  options: RenderTuiOptions,
): string {
  const width = Math.max(40, options.width ?? 100);
  const color = options.color ?? false;
  const navigation = TUI_VIEW_IDS.map((id, index) =>
    id === view.id ? `[${index + 1}:${id}]` : `${index + 1}:${id}`,
  ).join("  ");
  const lines = [
    paint(`AutoForge TUI — ${options.projectName}`, "heading", color),
    truncate(navigation, width),
    "─".repeat(Math.min(width, 100)),
    paint(view.title, "heading", color),
    truncate(view.summary, width),
  ];
  if (options.notice) lines.push("", truncate(options.notice, width));
  for (const section of view.sections) {
    lines.push("", paint(section.title, "heading", color));
    const labelWidth = Math.min(
      24,
      Math.max(8, ...section.rows.map(({ label }) => label.length)),
    );
    for (const item of section.rows) {
      lines.push(
        paint(
          `  ${item.label.padEnd(labelWidth)}  ${truncate(item.value, Math.max(10, width - labelWidth - 4))}`,
          item.tone,
          color,
        ),
      );
    }
  }
  lines.push("", `Commands: ${view.commands.join(" | ")}`);
  return lines.join("\n");
}
