import { Fragment } from "react";
import { auroraScale, compactNumber } from "./common";

interface Props {
  rows: string[]; // подписи строк
  cols: string[]; // подписи столбцов
  matrix: number[][]; // matrix[row][col]
  normalize?: "row" | "global"; // как красить: доля в строке или глобально
  asPercent?: boolean; // подписи в % (при normalize=row)
  height?: number;
}

export default function Heatmap({
  rows,
  cols,
  matrix,
  normalize = "global",
  asPercent = false,
  height,
}: Props) {
  const globalMax = Math.max(1, ...matrix.flat());
  const rowSums = matrix.map((r) => r.reduce((a, b) => a + b, 0) || 1);

  const norm = (r: number, c: number) =>
    normalize === "row" ? matrix[r][c] / rowSums[r] : matrix[r][c] / globalMax;

  const label = (r: number, c: number) => {
    if (asPercent) return `${Math.round((matrix[r][c] / rowSums[r]) * 100)}%`;
    return compactNumber(matrix[r][c]);
  };

  return (
    <div className="heatmap" style={{ minHeight: height }}>
      <div
        className="heatmap__grid"
        style={{ gridTemplateColumns: `minmax(70px, auto) repeat(${cols.length}, 1fr)` }}
      >
        <div className="heatmap__corner" />
        {cols.map((c) => (
          <div key={c} className="heatmap__colhead">
            {c}
          </div>
        ))}
        {rows.map((rname, r) => (
          <Fragment key={`row-${r}`}>
            <div className="heatmap__rowhead">
              {rname}
            </div>
            {cols.map((_, c) => {
              const t = norm(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  className="heatmap__cell"
                  style={{
                    background: matrix[r][c] > 0 ? auroraScale(t) : "rgba(128,128,128,0.10)",
                    color: t > 0.55 ? "#0b0b12" : "#e8e8ef",
                  }}
                  title={`${rname} · ${cols[c]}: ${matrix[r][c]}`}
                >
                  {matrix[r][c] > 0 ? label(r, c) : "·"}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
