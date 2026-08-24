import { formatNumber } from "../../lib/format";
import { chartStyles } from "./common";

export interface Stage {
  label: string;
  value: number;
  caption?: string;
}

interface Props {
  stages: Stage[];
  color?: string;
  compact?: boolean;
}

// Воронка: центрированные сужающиеся полосы (dashboard.py plot_funnel).
export default function FunnelView({ stages, color = "#7C3AED", compact = false }: Props) {
  const T = chartStyles();
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 12, padding: "0.4rem 0" }}>
      {stages.map((s, i) => {
        const w = Math.max((s.value / max) * 100, 6);
        const opacity = 0.85 - i * 0.22;
        return (
          <div key={i} style={{ textAlign: "center" }}>
            <div
              style={{
                margin: "0 auto",
                width: `${w}%`,
                minWidth: 60,
                background: `linear-gradient(90deg, ${color}, ${color}bb)`,
                opacity,
                borderRadius: 10,
                padding: compact ? "0.5rem" : "0.75rem 0.5rem",
                color: "#fff",
                fontWeight: 600,
                fontSize: compact ? "0.75rem" : "0.9rem",
                boxShadow: `0 4px 20px ${color}44`,
                transition: "width 0.4s ease",
              }}
            >
              {formatNumber(s.value)}
            </div>
            <div style={{ color: T.label, fontSize: compact ? "0.66rem" : "0.75rem", marginTop: 4 }}>
              {s.label}
              {s.caption && <span style={{ color: T.tick }}> · {s.caption}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
