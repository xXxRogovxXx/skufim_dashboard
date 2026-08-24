import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AXIS_STYLE, GRID_STYLE, TOOLTIP_STYLE, ChartFrame, compactNumber } from "./common";
import { SERIES_PALETTE } from "../../theme/tokens";

interface Props {
  data: any[];
  xKey: string;
  keys: string[]; // серии для стека
  height?: number;
}

export default function StackedArea({ data, xKey, keys, height = 340 }: Props) {
  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
          <defs>
            {keys.map((k, i) => (
              <linearGradient key={k} id={`sa-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES_PALETTE[i % SERIES_PALETTE.length]} stopOpacity={0.85} />
                <stop offset="100%" stopColor={SERIES_PALETTE[i % SERIES_PALETTE.length]} stopOpacity={0.5} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid {...GRID_STYLE} vertical={false} />
          <XAxis dataKey={xKey} {...AXIS_STYLE} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
          <YAxis {...AXIS_STYLE} tickFormatter={compactNumber} />
          <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => compactNumber(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stackId="1"
              stroke={SERIES_PALETTE[i % SERIES_PALETTE.length]}
              strokeWidth={1}
              fill={`url(#sa-${i})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
