import type { ReactNode } from "react";

// Стили осей/сетки/тултипа, читаемые из CSS-переменных текущей темы.
// Графики перемонтируются при смене темы (key на <main>), поэтому пересчитываются.
function cssv(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
export function chartStyles() {
  const tick = cssv("--chart-tick", "#71717a");
  const label = cssv("--chart-label", "#a1a1aa");
  const tipText = cssv("--chart-tip-text", "#fafafa");
  return {
    label,
    tick,
    text: cssv("--text", "#fafafa"),
    axis: { stroke: cssv("--chart-axis", "rgba(255,255,255,0.12)"), tick: { fill: tick, fontSize: 11 } },
    grid: { stroke: cssv("--chart-grid", "rgba(255,255,255,0.05)"), strokeDasharray: "3 3" },
    tooltip: {
      contentStyle: {
        background: cssv("--chart-tip-bg", "rgba(16,14,24,0.94)"),
        border: `2px solid ${cssv("--chart-tip-border", "rgba(255,255,255,0.14)")}`,
        borderRadius: parseInt(cssv("--chart-tip-radius", "12px")) || 12,
        color: tipText,
        fontSize: 12,
        boxShadow: cssv("--chart-tip-shadow", "0 10px 30px rgba(0,0,0,0.5)"),
      },
      labelStyle: { color: tick, marginBottom: 4 },
      itemStyle: { color: tipText },
    },
  };
}

// Брендовая последовательная шкала (aurora): фиолетовый → голубой → изумрудный → лайм.
// Заменяет клиническую viridis, чтобы графики читались премиально на тёмном стекле.
const AURORA_STOPS = [
  [124, 58, 237], // violet
  [56, 130, 246], // blue
  [56, 189, 248], // sky
  [52, 211, 153], // emerald
  [190, 242, 100], // lime
];
export function auroraScale(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (AURORA_STOPS.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = AURORA_STOPS[i];
  const b = AURORA_STOPS[Math.min(i + 1, AURORA_STOPS.length - 1)];
  const c = a.map((av, k) => Math.round(av + (b[k] - av) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return `${Math.round(n)}`;
}

export function ChartFrame({
  height = 340,
  children,
}: {
  height?: number;
  children: ReactNode;
}) {
  // ResponsiveContainer требует явной высоты у родителя
  return <div style={{ width: "100%", height }}>{children}</div>;
}

// Общие определения градиентов для area-заливок
export function GradientDefs({ ids }: { ids: { id: string; color: string }[] }) {
  return (
    <defs>
      {ids.map(({ id, color }) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.42} />
          <stop offset="55%" stopColor={color} stopOpacity={0.14} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      ))}
      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7C3AED" />
        <stop offset="100%" stopColor="#38BDF8" />
      </linearGradient>
      <linearGradient id="barGradV" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#A78BFA" />
        <stop offset="100%" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
  );
}
