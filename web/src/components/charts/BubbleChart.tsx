import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { chartStyles, ChartFrame, compactNumber, auroraScale } from "./common";

interface Props {
  data: any[];
  xKey: string;
  yKey: string;
  sizeKey: string;
  colorKey: string;
  labelKey: string;
  xLabel?: string;
  yLabel?: string;
  xLog?: boolean;
  yDomain?: [number, number];
  refX?: number;
  refY?: number;
  height?: number;
  colorLabel?: string;
}

export default function BubbleChart({
  data,
  xKey,
  yKey,
  sizeKey,
  colorKey,
  labelKey,
  xLabel,
  yLabel,
  xLog = false,
  yDomain,
  refX,
  refY,
  height = 420,
  colorLabel = "RSI",
}: Props) {
  const colorVals = data.map((d) => d[colorKey] as number);
  const cMin = Math.min(...colorVals);
  const cMax = Math.max(...colorVals);
  const cRange = cMax - cMin || 1;
  const T = chartStyles();

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div style={T.tooltip.contentStyle as any}>
        <div style={{ color: T.text, fontWeight: 600, marginBottom: 4 }}>{p[labelKey]}</div>
        <div style={{ color: T.label }}>
          {xLabel}: {compactNumber(p[xKey])}
        </div>
        <div style={{ color: T.label }}>
          {yLabel}: {p[yKey].toFixed(1)}
        </div>
        <div style={{ color: T.label }}>
          {colorLabel}: {p[colorKey].toFixed(1)}
        </div>
      </div>
    );
  };

  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 20, left: 4, bottom: 20 }}>
          <CartesianGrid {...T.grid} />
          <XAxis
            type="number"
            dataKey={xKey}
            scale={xLog ? "log" : "auto"}
            domain={xLog ? ["auto", "auto"] : undefined}
            allowDataOverflow={xLog}
            {...T.axis}
            tickFormatter={compactNumber}
            label={{ value: xLabel, position: "insideBottom", offset: -10, fill: T.tick, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey={yKey}
            domain={yDomain}
            {...T.axis}
            tickFormatter={compactNumber}
            label={{ value: yLabel, angle: -90, position: "insideLeft", fill: T.tick, fontSize: 11 }}
          />
          <ZAxis type="number" dataKey={sizeKey} range={[40, 520]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "rgba(128,128,128,0.35)" }} />
          {refX !== undefined && (
            <ReferenceLine x={refX} stroke="rgba(128,128,128,0.35)" strokeDasharray="4 4" />
          )}
          {refY !== undefined && (
            <ReferenceLine y={refY} stroke="rgba(128,128,128,0.35)" strokeDasharray="4 4" />
          )}
          <Scatter data={data} fillOpacity={0.8}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={auroraScale((d[colorKey] - cMin) / cRange)}
                stroke={T.tick}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
