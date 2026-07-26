import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  AXIS_STYLE,
  GRID_STYLE,
  TOOLTIP_STYLE,
  GradientDefs,
  ChartFrame,
  compactNumber,
} from "./common";
import { formatDateRu } from "../../lib/format";

export interface Mark {
  type: "area" | "line" | "bar";
  key: string;
  name: string;
  color: string;
  yAxis?: "left" | "right";
  dash?: string;
}

export interface VRef {
  x: string | number;
  color: string;
  label?: string;
  dash?: string;
}
export interface HRef {
  y: number;
  color: string;
  label?: string;
  yAxis?: "left" | "right";
}

interface Props {
  data: any[];
  xKey: string;
  xType?: "date" | "number";
  marks: Mark[];
  height?: number;
  leftLabel?: string;
  rightLabel?: string;
  rightDomain?: [number, number];
  vRefs?: VRef[];
  hRefs?: HRef[];
}

export default function TimeChart({
  data,
  xKey,
  xType = "date",
  marks,
  height = 340,
  leftLabel,
  rightLabel,
  rightDomain,
  vRefs = [],
  hRefs = [],
}: Props) {
  const hasRight = marks.some((m) => m.yAxis === "right");
  const gradIds = marks
    .filter((m) => m.type === "area")
    .map((m) => ({ id: `grad-${m.key}`, color: m.color }));

  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: hasRight ? 12 : 8, left: 0, bottom: 4 }}>
          <GradientDefs ids={gradIds} />
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis
            dataKey={xKey}
            {...AXIS_STYLE}
            tickFormatter={xType === "date" ? (v) => formatDateRu(v).slice(0, 5) : undefined}
            minTickGap={20}
          />
          <YAxis
            yAxisId="left"
            {...AXIS_STYLE}
            tickFormatter={compactNumber}
            label={
              leftLabel
                ? { value: leftLabel, angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 11 }
                : undefined
            }
          />
          {hasRight && (
            <YAxis
              yAxisId="right"
              orientation="right"
              {...AXIS_STYLE}
              domain={rightDomain}
              tickFormatter={compactNumber}
              label={
                rightLabel
                  ? { value: rightLabel, angle: 90, position: "insideRight", fill: "#71717a", fontSize: 11 }
                  : undefined
              }
            />
          )}
          <Tooltip
            {...TOOLTIP_STYLE}
            labelFormatter={(v) => (xType === "date" ? formatDateRu(String(v)) : `День ${v}`)}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#a1a1aa" }} />

          {hRefs.map((r, i) => (
            <ReferenceLine
              key={`h${i}`}
              yAxisId={r.yAxis ?? "left"}
              y={r.y}
              stroke={r.color}
              strokeDasharray="5 4"
              label={{ value: r.label, fill: r.color, fontSize: 10, position: "right" }}
            />
          ))}
          {vRefs.map((r, i) => (
            <ReferenceLine
              key={`v${i}`}
              yAxisId="left"
              x={r.x}
              stroke={r.color}
              strokeDasharray={r.dash === "dot" ? "2 3" : "5 4"}
              label={{ value: r.label, fill: r.color, fontSize: 10, angle: -90, position: "insideTopLeft" }}
            />
          ))}

          {marks.map((m) => {
            const yid = m.yAxis ?? "left";
            if (m.type === "area")
              return (
                <Area
                  key={m.key}
                  yAxisId={yid}
                  type="monotone"
                  dataKey={m.key}
                  name={m.name}
                  stroke={m.color}
                  strokeWidth={2.5}
                  fill={`url(#grad-${m.key})`}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              );
            if (m.type === "bar")
              return (
                <Bar
                  key={m.key}
                  yAxisId={yid}
                  dataKey={m.key}
                  name={m.name}
                  fill={m.color}
                  fillOpacity={0.55}
                  radius={[4, 4, 0, 0]}
                />
              );
            return (
              <Line
                key={m.key}
                yAxisId={yid}
                type="monotone"
                dataKey={m.key}
                name={m.name}
                stroke={m.color}
                strokeWidth={2.5}
                strokeDasharray={m.dash === "dash" ? "6 4" : m.dash === "dot" ? "2 3" : undefined}
                dot={false}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
