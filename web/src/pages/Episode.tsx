import { useMemo, useState } from "react";
import type { Dataset } from "../lib/data";
import { PERIODS } from "../config/sections";
import {
  filterPeriod,
  lifeCurve,
  daysToPercent,
  funnelData,
  episodePosition,
  sum,
  mean,
} from "../lib/agg";
import type { Record as Rec } from "../lib/data";
import { COLORS } from "../theme/tokens";
import { formatNumber, formatPercent, formatDecimal, formatDateRu, safeDiv } from "../lib/format";
import GlassCard from "../components/GlassCard";
import { SectionTitle, Hint } from "../components/SectionTitle";
import { KpiRow } from "../components/KpiRow";
import TimeChart from "../components/charts/TimeChart";
import FunnelView from "../components/charts/FunnelView";

const col = (rows: Rec[], k: keyof Rec) => rows.map((r) => (r[k] as number) ?? 0);

export default function Episode({ data }: { data: Dataset }) {
  const { records, meta } = data;
  const [periodIdx, setPeriodIdx] = useState(3);
  const [episode, setEpisode] = useState(meta.episodes[0]?.episode ?? "");

  const epMeta = meta.episodes.find((e) => e.episode === episode) ?? meta.episodes[0];
  const days = PERIODS[periodIdx].days;
  const release = epMeta.release_date!;

  const allData = useMemo(() => records.filter((r) => r.episode === episode), [records, episode]);
  const epData = useMemo(() => filterPeriod(allData, release, days), [allData, release, days]);
  const compareData = useMemo(() => filterPeriod(records, release, days), [records, release, days]);

  if (epData.length === 0) {
    return (
      <div>
        <Header episode={episode} episodes={meta.episodes} onEpisode={setEpisode}
          periodIdx={periodIdx} onPeriod={setPeriodIdx} />
        <GlassCard hover={false}>Нет данных для выпуска в выбранном периоде.</GlassCard>
      </div>
    );
  }

  const starts = sum(col(epData, "starts"));
  const streams = sum(col(epData, "streams"));
  const conv = safeDiv(streams, starts) * 100;
  const rsi = mean(col(epData, "rsi"));
  const listeners = sum(col(epData, "listeners"));
  const hours = sum(col(epData, "hours"));

  const dates = epData.map((r) => r.date).sort();
  const daysActive = Math.round(
    (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000
  );

  // Динамика по дням
  const dailyMap = new Map<string, { date: string; starts: number; streams: number; listeners: number; hours: number }>();
  for (const r of epData) {
    const cur = dailyMap.get(r.date) ?? { date: r.date, starts: 0, streams: 0, listeners: 0, hours: 0 };
    cur.starts += r.starts; cur.streams += r.streams; cur.listeners += r.listeners; cur.hours += r.hours;
    dailyMap.set(r.date, cur);
  }
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  const curve = lifeCurve(allData, release);
  const d50 = daysToPercent(curve, 50);
  const d90 = daysToPercent(curve, 90);
  let speed = { label: "📊 Данных нет", color: COLORS.textFaint };
  if (d90 !== null) {
    if (d90 <= 7) speed = { label: "⚡ Молниеносный", color: COLORS.danger };
    else if (d90 <= 14) speed = { label: "📈 Средний", color: COLORS.warning };
    else if (d90 <= 30) speed = { label: "🐢 Долгий", color: COLORS.success };
    else speed = { label: "🌿 Вечнозелёный", color: COLORS.accent };
  }

  const funnel = funnelData(epData);
  const drop1 = funnel.stage1 - funnel.stage2;
  const drop1p = safeDiv(drop1, funnel.stage1) * 100;
  const drop2 = funnel.stage2 - funnel.stage3;
  const drop2p = safeDiv(drop2, funnel.stage2) * 100;

  const posMetrics: { key: keyof Rec; label: string }[] = [
    { key: "starts", label: "Старты" },
    { key: "streams", label: "Стримы" },
    { key: "rsi", label: "RSI" },
    { key: "listeners", label: "Слушатели" },
    { key: "hours", label: "Часы" },
  ];
  const positions = posMetrics.map((m) => ({ label: m.label, ...episodePosition(epData, compareData, m.key) }));

  const kpiItems = [
    { icon: "🎬", value: formatNumber(starts), label: "Старты" },
    { icon: "🎧", value: formatNumber(streams), label: "Стримы" },
    { icon: "📈", value: formatPercent(conv), label: "Конверсия" },
    { icon: "⭐", value: formatDecimal(rsi), label: "RSI" },
    { icon: "👥", value: formatNumber(listeners), label: "Слушатели" },
    { icon: "⏱", value: formatDecimal(hours), label: "Часы" },
  ];

  return (
    <div>
      <Header episode={episode} episodes={meta.episodes} onEpisode={setEpisode}
        periodIdx={periodIdx} onPeriod={setPeriodIdx} />

      <KpiRow items={kpiItems} />

      <GlassCard>
        <SectionTitle>ℹ️ Информация о выпуске</SectionTitle>
        <div className="info-panel">
          {[
            ["📂 Формат", epMeta.format],
            ["🎭 Жанр", epMeta.genre],
            ["📅 Первая дата", formatDateRu(release)],
            ["📆 Дней в выборке", `${daysActive + 1}`],
            ["⏱️ Длительность", epMeta.duration],
          ].map(([label, value]) => (
            <div key={label} className="info-item">
              <div className="label">{label}</div>
              <div className="value">{value ?? "—"}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle>📊 Сравнение со средними показателями</SectionTitle>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Метрика</th><th>Значение</th><th>Среднее</th><th>Статус</th></tr></thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.label}>
                  <td>{p.label}</td>
                  <td>{formatDecimal(p.value, 1)}</td>
                  <td>{formatDecimal(p.mean, 1)}</td>
                  <td style={{ textAlign: "left", color: p.color }}>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle>📈 Динамика прослушиваний</SectionTitle>
        <TimeChart data={daily} xKey="date" height={340}
          marks={[
            { type: "area", key: "starts", name: "Старты", color: COLORS.starts },
            { type: "area", key: "streams", name: "Стримы", color: COLORS.streams },
          ]}
          vRefs={[{ x: release, color: COLORS.accentSoft, label: "📅 Релиз", dash: "dash" }]} />
      </GlassCard>

      <GlassCard>
        <SectionTitle>👥 Динамика аудитории выпуска</SectionTitle>
        <TimeChart data={daily} xKey="date" height={320}
          marks={[
            { type: "area", key: "listeners", name: "Слушатели", color: COLORS.listeners, yAxis: "left" },
            { type: "area", key: "hours", name: "Часы", color: COLORS.hours, yAxis: "right" },
          ]}
          leftLabel="Слушатели" rightLabel="Часы" />
      </GlassCard>

      <GlassCard>
        <SectionTitle>📈 Кривая жизни выпуска</SectionTitle>
        <Hint title="Как читать">Показывает, как быстро выпуск набирает прослушивания.</Hint>
        <TimeChart data={curve} xKey="day" xType="number" height={340}
          marks={[
            { type: "area", key: "normStreams", name: "Стримы (накоп. %)", color: COLORS.streams, yAxis: "left" },
            { type: "line", key: "cumStreams", name: "Стримы (абс.)", color: COLORS.accentSoft, yAxis: "right", dash: "dash" },
            { type: "line", key: "cumHours", name: "Часы (накоп.)", color: COLORS.hours, yAxis: "right", dash: "dot" },
          ]}
          leftLabel="% от всех стримов" rightLabel="Абс." rightDomain={undefined}
          hRefs={[
            { y: 50, color: COLORS.warning, label: "50%", yAxis: "left" },
            { y: 90, color: COLORS.success, label: "90%", yAxis: "left" },
          ]} />
        <div className="grid-3" style={{ marginTop: 14 }}>
          <div className="verdict">
            <div className="title" style={{ color: COLORS.warning }}>⏱️ Дней до 50%</div>
            <div className="value">{d50 ?? "—"}</div>
          </div>
          <div className="verdict">
            <div className="title" style={{ color: COLORS.success }}>⏱️ Дней до 90%</div>
            <div className="value">{d90 ?? "—"}</div>
          </div>
          <div className="verdict" style={{ borderColor: speed.color + "55" }}>
            <div className="title" style={{ color: speed.color }}>Тип роста</div>
            <div className="value" style={{ fontSize: "1rem", color: speed.color }}>{speed.label}</div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle>📊 Воронка внимания</SectionTitle>
        <Hint title="Что показывает">Сколько слушателей доходит до каждого этапа.</Hint>
        {funnel.hasData ? (
          <>
            <FunnelView
              color={COLORS.starts}
              stages={[
                { label: "Старты", value: funnel.stage1 },
                { label: "Средний %", value: funnel.stage2, caption: `${formatDecimal(funnel.avgListen * 100, 0)}%` },
                { label: "Дослушали", value: funnel.stage3, caption: `${formatDecimal(funnel.completion * 100, 0)}%` },
              ]}
            />
            <div className="grid-3" style={{ marginTop: 14 }}>
              <LossCard title="Старт → Средний" pct={drop1p} count={drop1} kind="start" />
              <LossCard title="Средний → Конец" pct={drop2p} count={drop2} kind="end" />
              <div className="verdict" style={{ borderColor: verdictColor(funnel.completion) + "55" }}>
                <div className="title" style={{ color: verdictColor(funnel.completion) }}>Итог</div>
                <div className="desc">Дослушивают {formatDecimal(funnel.completion * 100, 0)}%</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: COLORS.textMuted }}>Недостаточно данных для воронки.</div>
        )}
      </GlassCard>
    </div>
  );
}

function verdictColor(completion: number): string {
  if (completion > 0.4) return COLORS.success;
  if (completion > 0.25) return COLORS.warning;
  return COLORS.danger;
}

function LossCard({ title, pct, count, kind }: { title: string; pct: number; count: number; kind: "start" | "end" }) {
  let color = COLORS.success;
  if (pct > 30) color = COLORS.danger;
  else if (pct > 15) color = COLORS.warning;
  return (
    <div className="verdict" style={{ borderColor: color + "55" }}>
      <div className="title" style={{ color }}>{title}</div>
      <div className="desc">Потеря {formatDecimal(pct, 0)}% ({formatNumber(count)})</div>
      <div style={{ display: "none" }}>{kind}</div>
    </div>
  );
}

function Header({
  episode, episodes, onEpisode, periodIdx, onPeriod,
}: {
  episode: string;
  episodes: Dataset["meta"]["episodes"];
  onEpisode: (v: string) => void;
  periodIdx: number;
  onPeriod: (i: number) => void;
}) {
  return (
    <>
      <h1 className="page-title">Детальный анализ выпуска</h1>
      <div className="page-sub">Метрики, кривая жизни и воронка внимания</div>
      <GlassCard hover={false}>
        <div className="controls-bar">
          <div className="field" style={{ flex: 1, minWidth: 240 }}>
            <label className="control-label">🎯 Выпуск</label>
            <select value={episode} onChange={(e) => onEpisode(e.target.value)}>
              {episodes.map((ep) => <option key={ep.episode} value={ep.episode}>{ep.short}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="control-label">📅 Период</label>
            <div className="seg-group">
              {PERIODS.map((p, i) => (
                <button key={p.label} className={`seg ${i === periodIdx ? "active" : ""}`} onClick={() => onPeriod(i)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </>
  );
}
