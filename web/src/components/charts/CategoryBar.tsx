import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { chartStyles, ChartFrame, compactNumber, auroraScale } from "./common";
import { SERIES_PALETTE } from "../../theme/tokens";

interface Props {
  data: any[];
  labelKey: string; // категория
  valueKey: string;
  color?: string; // фикс. цвет или градиент по значению, если не задан
  palette?: string[]; // категориальные цвета (по индексу)
  horizontal?: boolean;
  height?: number;
  valueFormatter?: (v: number) => string;
  gradientByValue?: boolean;
}

export default function CategoryBar({
  data,
  labelKey,
  valueKey,
  color,
  palette,
  horizontal = false,
  height = 320,
  valueFormatter = compactNumber,
  gradientByValue = false,
}: Props) {
  const T = chartStyles();
  const values = data.map((d) => d[valueKey] as number);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const cellColor = (d: any, i: number): string => {
    if (palette) return palette[i % palette.length];
    if (gradientByValue) return auroraScale((d[valueKey] - min) / range);
    return color ?? SERIES_PALETTE[0];
  };

  return (
    <ChartFrame height={height}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: horizontal ? 44 : 12, left: horizontal ? 8 : 0, bottom: 8 }}
        >
          <CartesianGrid {...T.grid} horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" {...T.axis} tickFormatter={compactNumber} />
              <YAxis
                type="category"
                dataKey={labelKey}
                {...T.axis}
                width={130}
                tick={{ fill: T.label, fontSize: 10 }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={labelKey}
                {...T.axis}
                interval={0}
                angle={data.length > 5 ? -20 : 0}
                textAnchor={data.length > 5 ? "end" : "middle"}
                height={data.length > 5 ? 60 : 30}
                tick={{ fill: T.label, fontSize: 10 }}
              />
              <YAxis type="number" {...T.axis} tickFormatter={compactNumber} />
            </>
          )}
          <Tooltip {...T.tooltip} formatter={(v: number) => valueFormatter(v)} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey={valueKey} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={cellColor(d, i)} />
            ))}
            <LabelList
              dataKey={valueKey}
              position={horizontal ? "right" : "top"}
              formatter={(v: number) => valueFormatter(v)}
              style={{ fill: T.label, fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
