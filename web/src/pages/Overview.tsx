import { useMemo, useState, type ReactNode } from "react";
import type { Dataset } from "../lib/data";
import { OVERVIEW_SECTIONS, type SectionDef } from "../config/sections";
import {
  applyFilters,
  computeKpis,
  dailySeries,
  weekdaySeries,
  episodeAggregates,
  genreAggregates,
  paretoByHours,
  median,
  type Filters,
} from "../lib/agg";
import { COLORS, SERIES_PALETTE, WEEKDAY_LABELS } from "../theme/tokens";
import { formatNumber, formatPercent, formatDecimal, safeDiv } from "../lib/format";
import GlassCard from "../components/GlassCard";
import { SectionTitle, Hint } from "../components/SectionTitle";
import { KpiRow } from "../components/KpiRow";
import TimeChart from "../components/charts/TimeChart";
import CategoryBar from "../components/charts/CategoryBar";
import BubbleChart from "../components/charts/BubbleChart";

const byId = Object.fromEntries(OVERVIEW_SECTIONS.map((s) => [s.id, s])) as Record<string, SectionDef>;

function Section({ id, children }: { id: string; children: ReactNode }) {
  const def = byId[id];
  return (
    <GlassCard>
      <SectionTitle>{def.title}</SectionTitle>
      {def.hint && <Hint title="Как читать">{def.hint}</Hint>}
      {children}
    </GlassCard>
  );
}

export default function Overview({ data }: { data: Dataset }) {
  const { records, meta } = data;
  const [dateFrom, setDateFrom] = useState(meta.date_min);
  const [dateTo, setDateTo] = useState(meta.date_max);
  const [format, setFormat] = useState("Все");
  const [genre, setGenre] = useState("Все");

  const filters: Filters = { dateFrom, dateTo, format, genre };
  const filtered = useMemo(() => applyFilters(records, filters), [records, dateFrom, dateTo, format, genre]);

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const daily = useMemo(() => dailySeries(filtered), [filtered]);
  const weekday = useMemo(() => weekdaySeries(filtered), [filtered]);
  const epAgg = useMemo(() => episodeAggregates(filtered), [filtered]);
  const genres = useMemo(() => genreAggregates(filtered), [filtered]);
  const pareto = useMemo(() => paretoByHours(filtered), [filtered]);

  const matrix = epAgg
    .filter((e) => e.starts >= 10)
    .map((e) => ({ ...e, y: e.completion * 100, size: e.avg }));
  const medStarts = median(matrix.map((m) => m.starts));
  const medY = median(matrix.map((m) => m.y));

  const audience = epAgg.filter((e) => e.listeners > 0);
  const topHours = [...epAgg].sort((a, b) => b.hours - a.hours).slice(0, 10);
  const topListeners = [...epAgg].sort((a, b) => b.listeners - a.listeners).slice(0, 10);
  const topEff = [...epAgg]
    .map((e) => ({ ...e, eff: safeDiv(e.hours, e.listeners) }))
    .sort((a, b) => b.eff - a.eff)
    .slice(0, 10);
  const topRsi = [...epAgg].sort((a, b) => b.rsi - a.rsi);
  const hall = matrix;
  const hallFame = [...hall].sort((a, b) => b.completion - a.completion).slice(0, 5);
  const dangerZone = [...hall].sort((a, b) => a.completion - b.completion).slice(0, 5);

  const weekdayData = WEEKDAY_LABELS.map((d, i) => ({
    day: d,
    hours: weekday.hours[i],
    starts: weekday.starts[i],
    streams: weekday.streams[i],
  }));

  const summary = [...epAgg]
    .map((e) => ({ ...e, hpl: safeDiv(e.hours, e.listeners), spl: safeDiv(e.starts, e.listeners) }))
    .sort((a, b) => b.rsi - a.rsi);

  const kpiItems = [
    { icon: "🎬", value: formatNumber(kpis.totalStarts), label: "Всего стартов" },
    { icon: "🎧", value: formatNumber(kpis.totalStreams), label: "Всего стримов" },
    { icon: "📈", value: formatPercent(kpis.conversion), label: "Конверсия" },
    { icon: "📝", value: formatNumber(kpis.uniqueEpisodes), label: "Выпусков" },
    { icon: "⭐", value: formatDecimal(kpis.avgRsi), label: "Средний RSI" },
    { icon: "🎯", value: formatPercent(kpis.avgListen), label: "Средний %" },
    { icon: "👥", value: formatNumber(kpis.totalListeners), label: "Слушатели" },
    { icon: "⏱", value: formatDecimal(kpis.totalHours), label: "Часы" },
    { icon: "🎧", value: formatDecimal(kpis.hoursPerListener, 2), label: "Часы/слушателя" },
    { icon: "🔁", value: formatDecimal(kpis.startsPerListener, 2), label: "Старты/слушателя" },
  ];

  const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

  return (
    <div>
      <h1 className="page-title">Подкаст · Аналитика</h1>
      <div className="page-sub">Премиум дашборд · прослушивания · тренды</div>

      {/* Фильтры */}
      <GlassCard hover={false}>
        <div className="controls-bar">
          <div className="field">
            <label className="control-label">📅 С</label>
            <input type="date" value={dateFrom} min={meta.date_min} max={meta.date_max}
              onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field">
            <label className="control-label">📅 По</label>
            <input type="date" value={dateTo} min={meta.date_min} max={meta.date_max}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="field">
            <label className="control-label">📂 Формат</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>Все</option>
              {meta.formats.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="control-label">🎭 Жанр</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option>Все</option>
              {meta.genres.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div style={{ color: "#71717a", fontSize: "0.75rem", marginLeft: "auto", alignSelf: "center" }}>
            Записей: <b style={{ color: "#a1a1aa" }}>{filtered.length}</b> · Выпусков:{" "}
            <b style={{ color: "#a1a1aa" }}>{kpis.uniqueEpisodes}</b>
          </div>
        </div>
      </GlassCard>

      <KpiRow items={kpiItems} />

      <Section id="dynamics">
        <TimeChart
          data={daily}
          xKey="date"
          height={360}
          marks={[
            { type: "area", key: "starts", name: "Старты", color: COLORS.starts, yAxis: "left" },
            { type: "area", key: "streams", name: "Стримы", color: COLORS.streams, yAxis: "left" },
            { type: "line", key: "conversion", name: "Конверсия %", color: COLORS.conversion, yAxis: "right", dash: "dash" },
          ]}
          leftLabel="Кол-во"
          rightLabel="Конверсия %"
        />
      </Section>

      <Section id="audience">
        <TimeChart
          data={daily}
          xKey="date"
          height={340}
          marks={[
            { type: "area", key: "listeners", name: "Слушатели", color: COLORS.listeners, yAxis: "left" },
            { type: "area", key: "hours", name: "Часы", color: COLORS.hours, yAxis: "right" },
          ]}
          leftLabel="Слушатели"
          rightLabel="Часы"
        />
      </Section>

      <Section id="weekday_hours">
        <CategoryBar data={weekdayData} labelKey="day" valueKey="hours" gradientByValue height={300}
          valueFormatter={(v) => formatDecimal(v, 1)} />
      </Section>

      {matrix.length > 0 && (
        <Section id="quality_matrix">
          <BubbleChart
            data={matrix}
            xKey="starts" yKey="y" sizeKey="size" colorKey="rsi" labelKey="short"
            xLabel="Старты (популярность)" yLabel="Дослушиваемость (качество)"
            xLog refX={medStarts} refY={medY} colorLabel="RSI"
          />
        </Section>
      )}

      {audience.length > 0 && (
        <Section id="audience_scatter">
          <BubbleChart
            data={audience}
            xKey="listeners" yKey="hours" sizeKey="completion" colorKey="rsi" labelKey="short"
            xLabel="Слушатели" yLabel="Часы" xLog colorLabel="RSI"
          />
        </Section>
      )}

      <Section id="top_hours">
        <CategoryBar data={topHours} labelKey="short" valueKey="hours" horizontal color={COLORS.hours}
          height={360} valueFormatter={(v) => formatDecimal(v, 1)} />
      </Section>

      <Section id="top_listeners">
        <CategoryBar data={topListeners} labelKey="short" valueKey="listeners" horizontal color={COLORS.listeners}
          height={360} />
      </Section>

      <Section id="top_efficiency">
        <CategoryBar data={topEff} labelKey="short" valueKey="eff" horizontal color={COLORS.success}
          height={360} valueFormatter={(v) => formatDecimal(v, 2)} />
      </Section>

      {pareto.length > 1 && (
        <Section id="pareto">
          <TimeChart
            data={pareto}
            xKey="index" xType="number" height={360}
            marks={[
              { type: "bar", key: "hours", name: "Часы по выпускам", color: COLORS.starts, yAxis: "left" },
              { type: "line", key: "cumPercent", name: "Накопленный %", color: COLORS.streams, yAxis: "right" },
            ]}
            leftLabel="Часы" rightLabel="Накопленный %" rightDomain={[0, 105]}
            hRefs={[{ y: 80, color: COLORS.success, label: "80%", yAxis: "right" }]}
          />
        </Section>
      )}

      {hall.length > 0 && (
        <Section id="hall">
          <div className="grid-2">
            <div>
              <div style={{ color: COLORS.success, fontWeight: 600, marginBottom: 8 }}>🏆 Зал славы</div>
              {hallFame.map((e, i) => (
                <div key={e.episode} className="rank-item">
                  <span className="rank-name">{medals[i]} {e.short}</span>
                  <span style={{ color: COLORS.success, fontWeight: 600 }}>
                    {formatPercent(e.completion * 100)}
                    <span style={{ color: "#71717a", fontSize: "0.7rem", marginLeft: 6 }}>RSI {formatDecimal(e.rsi)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: COLORS.danger, fontWeight: 600, marginBottom: 8 }}>⚠️ Зона риска</div>
              {dangerZone.map((e, i) => (
                <div key={e.episode} className="rank-item">
                  <span className="rank-name">{i < 3 ? "⚠️" : "📌"} {e.short}</span>
                  <span style={{ color: COLORS.danger, fontWeight: 600 }}>
                    {formatPercent(e.completion * 100)}
                    <span style={{ color: "#71717a", fontSize: "0.7rem", marginLeft: 6 }}>RSI {formatDecimal(e.rsi)}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section id="top_rsi">
        <div className="grid-2">
          <CategoryBar data={topRsi.slice(0, 10)} labelKey="short" valueKey="rsi" gradientByValue
            height={340} valueFormatter={(v) => formatDecimal(v, 1)} />
          <div>
            <div className="sidebar__section">⭐ Топ RSI</div>
            {topRsi.slice(0, 5).map((e, i) => (
              <div key={e.episode} className="rank-item">
                <span className="rank-name">{medals[i]} {e.short}</span>
                <span style={{ color: COLORS.accent, fontWeight: 600 }}>{formatDecimal(e.rsi)}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="genres">
        <div className="grid-3">
          <div>
            <div style={{ color: COLORS.starts, fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>📊 По стартам</div>
            <CategoryBar data={[...genres].sort((a, b) => b.starts - a.starts).slice(0, 8)}
              labelKey="genre" valueKey="starts" color={COLORS.starts} height={260} />
          </div>
          <div>
            <div style={{ color: COLORS.streams, fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>🎧 По стримам</div>
            <CategoryBar data={[...genres].sort((a, b) => b.streams - a.streams).slice(0, 8)}
              labelKey="genre" valueKey="streams" color={COLORS.streams} height={260} />
          </div>
          <div>
            <div style={{ color: COLORS.success, fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>📈 По дослушиваемости</div>
            <CategoryBar
              data={[...genres].filter((g) => g.starts > 10).sort((a, b) => b.completion - a.completion).slice(0, 8)
                .map((g) => ({ ...g, comp: g.completion * 100 }))}
              labelKey="genre" valueKey="comp" color={COLORS.success} height={260}
              valueFormatter={(v) => formatPercent(v)} />
          </div>
        </div>
      </Section>

      <Section id="weekday">
        <div className="grid-2">
          <div>
            <div style={{ color: COLORS.starts, fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>📊 По стартам</div>
            <CategoryBar data={weekdayData} labelKey="day" valueKey="starts" palette={SERIES_PALETTE} height={280} />
          </div>
          <div>
            <div style={{ color: COLORS.streams, fontWeight: 600, fontSize: "0.85rem", marginBottom: 6 }}>🎧 По стримам</div>
            <CategoryBar data={weekdayData} labelKey="day" valueKey="streams" palette={SERIES_PALETTE} height={280} />
          </div>
        </div>
      </Section>

      <Section id="summary">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Название</th><th>Старты</th><th>Стримы</th><th>Конв. %</th>
                <th>Дослуш. %</th><th>Средний %</th><th>RSI</th>
                <th>Слуш.</th><th>Часы</th><th>Часы/сл.</th><th>Формат</th><th>Жанр</th>
              </tr>
            </thead>
            <tbody>
              {summary.slice(0, 50).map((e) => (
                <tr key={e.episode}>
                  <td>{e.short}</td>
                  <td>{formatNumber(e.starts)}</td>
                  <td>{formatNumber(e.streams)}</td>
                  <td>{formatDecimal(e.conversion, 1)}</td>
                  <td>{formatDecimal(e.completion * 100, 1)}</td>
                  <td>{formatDecimal(e.avg * 100, 1)}</td>
                  <td style={{ color: COLORS.accentSoft }}>{formatDecimal(e.rsi, 1)}</td>
                  <td>{formatNumber(e.listeners)}</td>
                  <td>{formatDecimal(e.hours, 1)}</td>
                  <td>{formatDecimal(e.hpl, 2)}</td>
                  <td style={{ textAlign: "left", color: "#a1a1aa" }}>{e.format}</td>
                  <td style={{ textAlign: "left", color: "#a1a1aa" }}>{e.genre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
