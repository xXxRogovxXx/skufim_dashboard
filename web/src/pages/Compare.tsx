import { useMemo, useState } from "react";
import type { Dataset, Record as Rec } from "../lib/data";
import { PERIODS } from "../config/sections";
import { filterPeriod, lifeCurve, daysToPercent, funnelData, sum, mean, groupBy } from "../lib/agg";
import { COLORS } from "../theme/tokens";
import { formatNumber, formatPercent, formatDecimal, safeDiv } from "../lib/format";
import GlassCard from "../components/GlassCard";
import { SectionTitle, Hint } from "../components/SectionTitle";
import { KpiRow } from "../components/KpiRow";
import TimeChart from "../components/charts/TimeChart";
import FunnelView from "../components/charts/FunnelView";
import DemographicsCompare from "../components/DemographicsCompare";

const col = (rows: Rec[], k: keyof Rec) => rows.map((r) => (r[k] as number) ?? 0);

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
}

function dailyByRelease(rows: Rec[], release: string) {
  const withDay = rows.map((r) => ({ ...r, day: daysBetween(release, r.date) + 1 }));
  const g = groupBy(withDay, (r) => r.day);
  return new Map(
    [...g.entries()].map(([day, rs]) => [
      day,
      { starts: sum(col(rs, "starts")), streams: sum(col(rs, "streams")), listeners: sum(col(rs, "listeners")), hours: sum(col(rs, "hours")) },
    ])
  );
}

export default function Compare({ data }: { data: Dataset }) {
  const { records, meta } = data;
  const [periodIdx, setPeriodIdx] = useState(3);
  const [ep1, setEp1] = useState(meta.episodes[0]?.episode ?? "");
  const [ep2, setEp2] = useState(meta.episodes[1]?.episode ?? "");

  const m1 = meta.episodes.find((e) => e.episode === ep1)!;
  const m2 = meta.episodes.find((e) => e.episode === ep2)!;
  const days = PERIODS[periodIdx].days;

  const data1 = useMemo(() => filterPeriod(records.filter((r) => r.episode === ep1), m1.release_date!, days), [records, ep1, days]);
  const data2 = useMemo(() => filterPeriod(records.filter((r) => r.episode === ep2), m2.release_date!, days), [records, ep2, days]);

  const controls = (
    <>
      <h1 className="page-title">Сравнение двух выпусков</h1>
      <div className="page-sub">Динамика, кривые жизни и воронки бок о бок</div>
      <GlassCard hover={false}>
        <div className="controls-bar">
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label className="control-label">📌 Выпуск №1</label>
            <select value={ep1} onChange={(e) => setEp1(e.target.value)}>
              {meta.episodes.map((ep) => <option key={ep.episode} value={ep.episode}>{ep.short}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label className="control-label">📌 Выпуск №2</label>
            <select value={ep2} onChange={(e) => setEp2(e.target.value)}>
              {meta.episodes.map((ep) => <option key={ep.episode} value={ep.episode}>{ep.short}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="control-label">📅 Период</label>
            <div className="seg-group">
              {PERIODS.map((p, i) => (
                <button key={p.label} className={`seg ${i === periodIdx ? "active" : ""}`} onClick={() => setPeriodIdx(i)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </>
  );

  if (ep1 === ep2) {
    return <div>{controls}<GlassCard hover={false}>Выберите два разных выпуска для сравнения.</GlassCard></div>;
  }
  if (data1.length === 0 || data2.length === 0) {
    return <div>{controls}<GlassCard hover={false}>Нет данных для выбранных выпусков в этом периоде.</GlassCard></div>;
  }

  const stat = (rows: Rec[]) => {
    const starts = sum(col(rows, "starts"));
    const streams = sum(col(rows, "streams"));
    return {
      starts, streams,
      conv: safeDiv(streams, starts) * 100,
      rsi: mean(col(rows, "rsi")),
      listeners: sum(col(rows, "listeners")),
      hours: sum(col(rows, "hours")),
    };
  };
  const s1 = stat(data1);
  const s2 = stat(data2);

  const kpi = (s: ReturnType<typeof stat>) => [
    { icon: "🎬", value: formatNumber(s.starts), label: "Старты" },
    { icon: "🎧", value: formatNumber(s.streams), label: "Стримы" },
    { icon: "📈", value: formatPercent(s.conv), label: "Конверсия" },
    { icon: "⭐", value: formatDecimal(s.rsi), label: "RSI" },
    { icon: "👥", value: formatNumber(s.listeners), label: "Слушатели" },
    { icon: "⏱", value: formatDecimal(s.hours), label: "Часы" },
  ];

  // Динамика по дням от релиза
  const d1 = dailyByRelease(data1, m1.release_date!);
  const d2 = dailyByRelease(data2, m2.release_date!);
  const allDays = [...new Set([...d1.keys(), ...d2.keys()])].sort((a, b) => a - b);
  const merged = allDays.map((day) => ({
    day,
    starts1: d1.get(day)?.starts ?? 0, starts2: d2.get(day)?.starts ?? 0,
    streams1: d1.get(day)?.streams ?? 0, streams2: d2.get(day)?.streams ?? 0,
    listeners1: d1.get(day)?.listeners ?? 0, listeners2: d2.get(day)?.listeners ?? 0,
    hours1: d1.get(day)?.hours ?? 0, hours2: d2.get(day)?.hours ?? 0,
  }));

  // Кривые жизни (всё время)
  const curve1 = lifeCurve(records.filter((r) => r.episode === ep1), m1.release_date!);
  const curve2 = lifeCurve(records.filter((r) => r.episode === ep2), m2.release_date!);
  const cMap1 = new Map(curve1.map((r) => [r.day, r.normStreams]));
  const cMap2 = new Map(curve2.map((r) => [r.day, r.normStreams]));
  const cDays = [...new Set([...cMap1.keys(), ...cMap2.keys()])].sort((a, b) => a - b);
  const curveMerged = cDays.map((day) => ({ day, n1: cMap1.get(day) ?? null, n2: cMap2.get(day) ?? null }));

  const d1_50 = daysToPercent(curve1, 50), d2_50 = daysToPercent(curve2, 50);
  const d1_90 = daysToPercent(curve1, 90), d2_90 = daysToPercent(curve2, 90);
  const slope = (c: typeof curve1) => (c.length >= 3 ? (c[2].normStreams - c[0].normStreams) / 2 : 0);
  const slope1 = slope(curve1), slope2 = slope(curve2);

  const f1 = funnelData(data1);
  const f2 = funnelData(data2);

  const rsiWinner =
    s1.rsi > s2.rsi * 1.05 ? { name: m1.short, color: COLORS.success, detail: "значительно лучше по RSI" }
    : s1.rsi > s2.rsi ? { name: m1.short, color: COLORS.starts, detail: "лучше по RSI" }
    : s2.rsi > s1.rsi * 1.05 ? { name: m2.short, color: COLORS.success, detail: "значительно лучше по RSI" }
    : s2.rsi > s1.rsi ? { name: m2.short, color: COLORS.streams, detail: "лучше по RSI" }
    : { name: "Ничья", color: COLORS.warning, detail: "выпуски примерно равны" };

  const cmp = (a: number | null, b: number | null, lower: boolean) => {
    if (a == null || b == null) return "🤝";
    if (a === b) return "🤝";
    return (lower ? a < b : a > b) ? "1️⃣" : "2️⃣";
  };

  return (
    <div>
      {controls}

      <div className="grid-2">
        <GlassCard hover={false}>
          <div style={{ color: COLORS.starts, textAlign: "center", fontWeight: 600, marginBottom: 10 }}>{m1.short}</div>
          <KpiRow items={kpi(s1)} />
        </GlassCard>
        <GlassCard hover={false}>
          <div style={{ color: COLORS.streams, textAlign: "center", fontWeight: 600, marginBottom: 10 }}>{m2.short}</div>
          <KpiRow items={kpi(s2)} />
        </GlassCard>
      </div>

      <GlassCard>
        <SectionTitle>📈 Сравнение стартов (по дням от релиза)</SectionTitle>
        <TimeChart data={merged} xKey="day" xType="number" height={320}
          marks={[
            { type: "area", key: "starts1", name: m1.short, color: COLORS.starts },
            { type: "area", key: "starts2", name: m2.short, color: COLORS.streams },
          ]} />
      </GlassCard>

      <GlassCard>
        <SectionTitle>🎧 Сравнение стримов</SectionTitle>
        <TimeChart data={merged} xKey="day" xType="number" height={320}
          marks={[
            { type: "area", key: "streams1", name: m1.short, color: COLORS.success },
            { type: "area", key: "streams2", name: m2.short, color: COLORS.accentSoft },
          ]} />
      </GlassCard>

      <GlassCard>
        <SectionTitle>👥 Сравнение аудитории</SectionTitle>
        <TimeChart data={merged} xKey="day" xType="number" height={320}
          marks={[
            { type: "area", key: "listeners1", name: `${m1.short} · слушатели`, color: COLORS.listeners, yAxis: "left" },
            { type: "area", key: "listeners2", name: `${m2.short} · слушатели`, color: "#F97316", yAxis: "left" },
            { type: "line", key: "hours1", name: `${m1.short} · часы`, color: COLORS.hours, yAxis: "right", dash: "dash" },
            { type: "line", key: "hours2", name: `${m2.short} · часы`, color: "#60A5FA", yAxis: "right", dash: "dash" },
          ]}
          leftLabel="Слушатели" rightLabel="Часы" />
      </GlassCard>

      <DemographicsCompare
        scope1={data.demographics?.byEpisode[ep1] ?? null}
        scope2={data.demographics?.byEpisode[ep2] ?? null}
        label1={m1.short}
        label2={m2.short}
      />

      <GlassCard>
        <SectionTitle>📈 Сравнение кривых жизни</SectionTitle>
        <Hint title="Как сравнивать">Чей график круче — тот быстрее взлетает. Чей длиннее — тот живёт дольше.</Hint>
        <TimeChart data={curveMerged} xKey="day" xType="number" height={340}
          marks={[
            { type: "area", key: "n1", name: m1.short, color: COLORS.starts, yAxis: "left" },
            { type: "line", key: "n2", name: m2.short, color: COLORS.streams, yAxis: "left" },
          ]}
          leftLabel="% от всех стримов"
          hRefs={[
            { y: 50, color: COLORS.warning, label: "50%" },
            { y: 90, color: COLORS.success, label: "90%" },
          ]} />
        <div className="grid-3" style={{ marginTop: 14 }}>
          <div className="verdict">
            <div className="title" style={{ color: COLORS.starts }}>⏱️ Дней до 50% {cmp(d1_50, d2_50, true)}</div>
            <div className="value" style={{ fontSize: "0.95rem" }}>
              {m1.short}: {d1_50 ?? "—"} · {m2.short}: {d2_50 ?? "—"}
            </div>
          </div>
          <div className="verdict">
            <div className="title" style={{ color: COLORS.success }}>⏱️ Дней до 90% {cmp(d1_90, d2_90, false)}</div>
            <div className="value" style={{ fontSize: "0.95rem" }}>
              {m1.short}: {d1_90 ?? "—"} · {m2.short}: {d2_90 ?? "—"}
            </div>
          </div>
          <div className="verdict">
            <div className="title" style={{ color: COLORS.warning }}>🚀 Скорость старта {slope1 > slope2 ? "1️⃣" : slope2 > slope1 ? "2️⃣" : "🤝"}</div>
            <div className="value" style={{ fontSize: "0.95rem" }}>
              {formatDecimal(slope1, 1)}%/д · {formatDecimal(slope2, 1)}%/д
            </div>
          </div>
        </div>
      </GlassCard>

      {f1.hasData && f2.hasData && (
        <GlassCard>
          <SectionTitle>📊 Сравнение воронок внимания</SectionTitle>
          <div className="grid-2">
            <div>
              <div style={{ color: COLORS.starts, textAlign: "center", fontWeight: 600, marginBottom: 8 }}>{m1.short}</div>
              <FunnelView compact color={COLORS.starts} stages={[
                { label: "Старты", value: f1.stage1 },
                { label: "Средний %", value: f1.stage2, caption: `${formatDecimal(f1.avgListen * 100, 0)}%` },
                { label: "Дослушали", value: f1.stage3, caption: `${formatDecimal(f1.completion * 100, 0)}%` },
              ]} />
            </div>
            <div>
              <div style={{ color: COLORS.streams, textAlign: "center", fontWeight: 600, marginBottom: 8 }}>{m2.short}</div>
              <FunnelView compact color={COLORS.streams} stages={[
                { label: "Старты", value: f2.stage1 },
                { label: "Средний %", value: f2.stage2, caption: `${formatDecimal(f2.avgListen * 100, 0)}%` },
                { label: "Дослушали", value: f2.stage3, caption: `${formatDecimal(f2.completion * 100, 0)}%` },
              ]} />
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <SectionTitle>🏆 Итоговый вердикт по RSI</SectionTitle>
        <div className="grid-3">
          <div className="verdict">
            <div className="title" style={{ color: COLORS.starts }}>⭐ RSI {m1.short}</div>
            <div className="value">{formatDecimal(s1.rsi)}</div>
          </div>
          <div className="verdict">
            <div className="title" style={{ color: COLORS.streams }}>⭐ RSI {m2.short}</div>
            <div className="value">{formatDecimal(s2.rsi)}</div>
          </div>
          <div className="verdict" style={{ borderColor: rsiWinner.color + "66" }}>
            <div className="title" style={{ color: rsiWinner.color }}>🏆 Победитель</div>
            <div className="value" style={{ color: rsiWinner.color, fontSize: "1.1rem" }}>{rsiWinner.name}</div>
            <div className="desc">{rsiWinner.detail}</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
