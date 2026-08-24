import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { chartStyles, compactNumber } from "./common";
import type { DemoDim } from "../../lib/data";

// Цвета по полу: мужчины — голубой, женщины — розовый, не определён — серый
const GENDER_COLORS: Record<string, string> = {
  Мужчины: "#38BDF8",
  Женщины: "#F472B6",
  "Не определен": "#71717A",
};

interface Props {
  data: DemoDim[];
  metric: "starts" | "streams";
  height?: number;
}

export default function GenderDonut({ data, metric, height = 300 }: Props) {
  const rows = data
    .map((d) => ({ name: d.name, value: d[metric] }))
    .filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  const T = chartStyles();

  if (total === 0) {
    return <div className="chart-empty">Нет данных</div>;
  }

  return (
    <div>
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {rows.map((d, i) => (
              <Cell key={i} fill={GENDER_COLORS[d.name] ?? "#8B5CF6"} />
            ))}
          </Pie>
          <Tooltip
            {...T.tooltip}
            formatter={(v: number, n: string) => [
              `${compactNumber(v)} (${((v / total) * 100).toFixed(1)}%)`,
              n,
            ]}
          />
          {/* Центральная подпись */}
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            style={{ fill: T.text, fontSize: 26, fontWeight: 700 }}
          >
            {compactNumber(total)}
          </text>
          <text
            x="50%"
            y="57%"
            textAnchor="middle"
            style={{ fill: T.label, fontSize: 11, letterSpacing: "0.08em" }}
          >
            {metric === "starts" ? "СТАРТОВ" : "СТРИМОВ"}
          </text>
        </PieChart>
      </ResponsiveContainer>
      </div>
      {/* Легенда с процентами */}
      <div className="donut-legend">
        {rows.map((d) => (
          <div key={d.name} className="donut-legend__item">
            <span
              className="donut-legend__dot"
              style={{ background: GENDER_COLORS[d.name] ?? "#8B5CF6" }}
            />
            <span className="donut-legend__name">{d.name}</span>
            <span className="donut-legend__val">
              {((d.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
