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
import { chartStyles, ChartFrame, compactNumber } from "./common";
import { SERIES_PALETTE } from "../../theme/tokens";

interface Props {
  data: any[];
  xKey: string;
  keys: string[]; // серии для стека
  height?: number;
}

export default function StackedArea({ data, xKey, keys, height = 340 }: Props) {
  const T = chartStyles();
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
          <CartesianGrid {...T.grid} vertical={false} />
          <XAxis dataKey={xKey} {...T.axis} tick={{ fill: T.label, fontSize: 10 }} />
          <YAxis {...T.axis} tickFormatter={compactNumber} />
          <Tooltip {...T.tooltip} formatter={(v: number) => compactNumber(v)} />
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
