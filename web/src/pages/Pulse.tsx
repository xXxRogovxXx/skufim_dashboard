import { useMemo } from "react";
import type { Dataset } from "../lib/data";
import { COLORS } from "../theme/tokens";
import { sum } from "../lib/agg";
import { formatNumber, formatPercent } from "../lib/format";
import {
  periodDeltas,
  newVsCatalog,
  releaseWeekday,
  cadence,
  evergreen,
  seasonality,
  topCities,
  demographicsTrend,
  healthScore,
} from "../lib/pulse";
import GlassCard from "../components/GlassCard";
import { SectionTitle, Hint } from "../components/SectionTitle";
import Takeaway from "../components/Takeaway";
import TimeChart from "../components/charts/TimeChart";
import StackedArea from "../components/charts/StackedArea";
import CategoryBar from "../components/charts/CategoryBar";
import Heatmap from "../components/charts/Heatmap";
import { compactNumber } from "../components/charts/common";

export default function Pulse({ data }: { data: Dataset }) {
  const { records, meta, insights, demographics } = data;

  const deltas = useMemo(() => periodDeltas(records, 30), [records]);
  const nvc = useMemo(() => newVsCatalog(records, meta), [records, meta]);
  const rw = useMemo(() => releaseWeekday(records, meta), [records, meta]);
  const cad = useMemo(() => cadence(meta), [meta]);
  const eg = useMemo(() => evergreen(records, meta), [records, meta]);
  const seas = useMemo(() => seasonality(records), [records]);
  const cities = useMemo(() => topCities(demographics?.overall.city), [demographics]);
  const demoTrend = useMemo(() => demographicsTrend(insights), [insights]);

  const avgListenPct = useMemo(() => {
    const st = sum(records.map((r) => r.streams ?? 0));
    return st ? (sum(records.map((r) => (r.avg ?? 0) * (r.streams ?? 0))) / st) * 100 : 0;
  }, [records]);
  const health = useMemo(() => healthScore(deltas, avgListenPct), [deltas, avgListenPct]);

  // ---- авто-выводы ----
  const dStreams = deltas.items.find((i) => i.label === "Стримы")?.delta;
  const dListeners = deltas.items.find((i) => i.label === "Слушатели")?.delta;
  const deltaOut = `За последние 30 дней стримы ${fmtD(dStreams)}, слушатели ${fmtD(dListeners)} к предыдущим 30 дням.`;

  const dt0 = demoTrend[0];
  const dt1 = demoTrend[demoTrend.length - 1];
  const demoOut =
    dt0 && dt1
      ? `Доля женщин ${dt0.womenShare}% → ${dt1.womenShare}%, средний возраст ${dt0.avgAge} → ${dt1.avgAge}. Аудитория ${dt1.womenShare! > dt0.womenShare! ? "феминизируется" : "остаётся мужской"} и ${dt1.avgAge! > dt0.avgAge! ? "взрослеет" : "молодеет"}.`
      : "";

  const nvcOut = `Каталог (выпуски старше 30 дней) даёт ${nvc.catShare}% прослушиваний — ${nvc.catShare >= 50 ? "шоу живёт за счёт каталога, старые выпуски работают" : "шоу держится в основном на новинках"}.`;

  const rwOut = rw.best
    ? `Лучше всего стартуют выпуски, вышедшие в «${rw.best.day}» (~${compactNumber(rw.best.value)} стримов за первые 2 недели). Сейчас между релизами в среднем ${cad.recentGap} дн. (~${cad.perMonth}/мес).`
    : "";

  const egOut = eg.top.length
    ? `В среднем ${eg.avgTail}% прослушиваний приходит уже после 30-го дня. Самый «вечнозелёный» — «${eg.top[0].short}» (${eg.top[0].tail}% хвоста).`
    : "";

  const seasOut = (() => {
    let peak = { v: -1, y: "", m: 0 },
      low = { v: Infinity, y: "", m: 0 };
    seas.years.forEach((y, yi) =>
      seas.months.forEach((_, mi) => {
        const v = seas.matrix[yi][mi];
        if (v > 0 && v > peak.v) peak = { v, y, m: mi };
        if (v > 0 && v < low.v) low = { v, y, m: mi };
      })
    );
    return peak.v > 0
      ? `Пик активности — ${seas.months[peak.m]} ${peak.y} (${compactNumber(peak.v)} стартов), самый тихий — ${seas.months[low.m]} ${low.y}.`
      : "";
  })();

  const citiesOut = cities.length
    ? `На топ-${cities.length} городов приходится ${cities.reduce((s, c) => s + c.share, 0).toFixed(0)}% узнанной аудитории; лидирует ${cities[0].name} (${cities[0].share}%).`
    : "";

  return (
    <div>
      <h1 className="page-title">Пульс</h1>
      <div className="page-sub">Здоровье шоу · тренды · каденс · сезонность</div>

      {/* ---- HEALTH SCORE ---- */}
      <GlassCard>
        <SectionTitle>❤️ Индекс здоровья шоу</SectionTitle>
        <Hint title="Как считается">
          Композитный индекс 0–100: конверсия (40%), дослушиваемость (30%), тренд стримов (30%).
        </Hint>
        <div className="health">
          <div className="health__score" style={{ color: healthColor(health.score) }}>
            {health.score}
            <span className="health__max">/100</span>
          </div>
          <div className="health__body">
            <div className="health__label" style={{ color: healthColor(health.score) }}>
              {health.label}
            </div>
            <Bar label="Конверсия" v={health.convScore} />
            <Bar label="Дослушиваемость" v={health.complScore} />
            <Bar label="Тренд" v={health.trendScore} />
          </div>
        </div>
      </GlassCard>

      {/* ---- KPI Δ ---- */}
      <GlassCard>
        <SectionTitle>📊 Динамика KPI (30 дней vs предыдущие 30)</SectionTitle>
        <div className="kpi-row">
          {deltas.items.map((it) => (
            <div key={it.label} className="kpi glass glass--hover">
              <div className="kpi__top" />
              <div className="kpi__value">
                {it.isPercent ? formatPercent(it.value as number) : formatNumber(it.value as number)}
              </div>
              <div className="kpi__label">{it.label}</div>
              <div className="kpi__delta" style={{ color: deltaColor(it.delta) }}>
                {fmtD(it.delta)}
              </div>
            </div>
          ))}
        </div>
        <Takeaway>{deltaOut}</Takeaway>
      </GlassCard>

      {/* ---- ДЕМОГРАФИЯ ВО ВРЕМЕНИ ---- */}
      {demoTrend.length > 1 && (
        <GlassCard>
          <SectionTitle>🧬 Демография во времени</SectionTitle>
          <Hint title="Как читать">Доля женщин (%) и средний возраст аудитории по месяцам.</Hint>
          <TimeChart
            data={demoTrend}
            xKey="month"
            height={320}
            marks={[
              { type: "area", key: "womenShare", name: "Женщины, %", color: "#F472B6", yAxis: "left" },
              { type: "line", key: "avgAge", name: "Средний возраст", color: COLORS.hours, yAxis: "right" },
            ]}
            leftLabel="Женщины, %"
            rightLabel="Возраст"
          />
          <Takeaway>{demoOut}</Takeaway>
        </GlassCard>
      )}

      {/* ---- НОВОЕ vs КАТАЛОГ ---- */}
      <GlassCard>
        <SectionTitle>🆕 Новое vs каталог</SectionTitle>
        <Hint title="Как читать">
          Сколько стримов в месяц дают свежие выпуски (&lt;30 дней) и старый каталог.
        </Hint>
        <StackedArea data={nvc.data} xKey="month" keys={["Свежие", "Каталог"]} />
        <Takeaway>{nvcOut}</Takeaway>
      </GlassCard>

      {/* ---- ЛУЧШИЙ ДЕНЬ РЕЛИЗА ---- */}
      <GlassCard>
        <SectionTitle>🗓 Лучший день релиза</SectionTitle>
        <Hint title="Как читать">
          Средние стримы за первые 2 недели в зависимости от дня недели выхода.
        </Hint>
        <CategoryBar data={rw.data} labelKey="day" valueKey="value" gradientByValue height={280} />
        <div className="grid-3" style={{ marginTop: 14 }}>
          <Stat label="Выпусков всего" value={`${cad.total}`} />
          <Stat label="Медианный интервал" value={`${cad.recentGap} дн.`} color={COLORS.warning} />
          <Stat label="Темп" value={`~${cad.perMonth}/мес`} color={COLORS.success} />
        </div>
        <Takeaway>{rwOut}</Takeaway>
      </GlassCard>

      {/* ---- ВЕЧНОЗЕЛЁНОСТЬ ---- */}
      <GlassCard>
        <SectionTitle>🌲 Вечнозелёность выпусков</SectionTitle>
        <Hint title="Как читать">Доля прослушиваний, пришедшая после 30-го дня. Выше — дольше живёт.</Hint>
        <CategoryBar
          data={eg.top}
          labelKey="short"
          valueKey="tail"
          horizontal
          gradientByValue
          valueFormatter={(v) => `${v}%`}
          height={Math.max(280, eg.top.length * 30)}
        />
        <Takeaway>{egOut}</Takeaway>
      </GlassCard>

      {/* ---- СЕЗОННОСТЬ ---- */}
      <GlassCard>
        <SectionTitle>📅 Сезонность (год × месяц)</SectionTitle>
        <Hint title="Как читать">Старты по месяцам и годам — где пики и спады.</Hint>
        <Heatmap rows={seas.years} cols={seas.months} matrix={seas.matrix} normalize="global" />
        <Takeaway>{seasOut}</Takeaway>
      </GlassCard>

      {/* ---- ТОП ГОРОДОВ ТАБЛИЦЕЙ ---- */}
      {cities.length > 0 && (
        <GlassCard>
          <SectionTitle>🏙 Топ-15 городов</SectionTitle>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Город</th>
                  <th>Старты</th>
                  <th>Доля</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c, i) => (
                  <tr key={c.name}>
                    <td>{i + 1}</td>
                    <td style={{ textAlign: "left" }}>{c.name}</td>
                    <td>{formatNumber(c.starts)}</td>
                    <td>{c.share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Takeaway>{citiesOut}</Takeaway>
        </GlassCard>
      )}
    </div>
  );
}

function fmtD(d: number | null | undefined): string {
  if (d == null) return "—";
  return `${d >= 0 ? "▲ +" : "▼ "}${d}%`;
}
function deltaColor(d: number | null | undefined): string {
  if (d == null) return COLORS.textFaint;
  return d >= 0 ? COLORS.success : COLORS.danger;
}
function healthColor(s: number): string {
  return s >= 75 ? COLORS.success : s >= 55 ? "#84CC16" : s >= 40 ? COLORS.warning : COLORS.danger;
}
function Bar({ label, v }: { label: string; v: number }) {
  return (
    <div className="health-bar">
      <span className="health-bar__label">{label}</span>
      <span className="health-bar__track">
        <span className="health-bar__fill" style={{ width: `${Math.round(v)}%` }} />
      </span>
      <span className="health-bar__val">{Math.round(v)}</span>
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="verdict">
      <div className="title" style={{ color: color ?? COLORS.accentSoft }}>{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
