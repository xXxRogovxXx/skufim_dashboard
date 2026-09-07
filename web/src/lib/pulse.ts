// Расчёты для раздела «Пульс»: тренды, здоровье, каденс, сезонность.
import type { Record as Rec, Meta, Insights } from "./data";
import { sum, mean, median, groupBy } from "./agg";

const col = (rows: Rec[], k: keyof Rec) => rows.map((r) => (r[k] as number) ?? 0);
const daysBetween = (a: string, b: string) =>
  Math.round((+new Date(b + "T00:00:00") - +new Date(a + "T00:00:00")) / 86400000);
const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MON = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function maxDate(records: Rec[]): string {
  return records.reduce((m, r) => (r.date > m ? r.date : m), records[0]?.date ?? "");
}
function windowRows(records: Rec[], from: string, to: string): Rec[] {
  return records.filter((r) => r.date > from && r.date <= to);
}
function shift(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- KPI с Δ к прошлому периоду (trailing N дней vs предыдущие N) ----
export function periodDeltas(records: Rec[], days = 30) {
  const end = maxDate(records);
  const midA = shift(end, -days);
  const midB = shift(end, -2 * days);
  const A = windowRows(records, midA, end);
  const B = windowRows(records, midB, midA);
  const metric = (rows: Rec[]) => {
    const st = sum(col(rows, "starts"));
    const sm = sum(col(rows, "streams"));
    return {
      Старты: st,
      Стримы: sm,
      "Конверсия": st ? (sm / st) * 100 : 0,
      Слушатели: sum(col(rows, "listeners")),
      Часы: sum(col(rows, "hours")),
    };
  };
  const a = metric(A),
    b = metric(B);
  const pct = (x: number, y: number) => (y ? Math.round((x / y - 1) * 100) : null);
  return {
    days,
    from: midA,
    to: end,
    items: (Object.keys(a) as (keyof typeof a)[]).map((k) => ({
      label: k,
      value: a[k],
      isPercent: k === "Конверсия",
      delta: pct(a[k], b[k]),
    })),
  };
}

// ---- Новое vs каталог (доля стримов на свежие <freshDays дней) ----
export function newVsCatalog(records: Rec[], meta: Meta, freshDays = 30) {
  const rel = new Map(meta.episodes.map((e) => [e.episode, e.release_date]));
  const byMonth = groupBy(records, (r) => r.date.slice(0, 7));
  const data = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, rs]) => {
      let fresh = 0,
        cat = 0;
      for (const r of rs) {
        const rd = rel.get(r.episode);
        const age = rd ? daysBetween(rd, r.date) : 999;
        if (age < freshDays) fresh += r.streams;
        else cat += r.streams;
      }
      return { month, Свежие: fresh, Каталог: cat };
    });
  const totFresh = sum(data.map((d) => d.Свежие));
  const totCat = sum(data.map((d) => d.Каталог));
  const catShare = totFresh + totCat ? Math.round((totCat / (totFresh + totCat)) * 100) : 0;
  return { data, catShare };
}

// ---- Лучший день релиза (первые 14 дней стримов) ----
export function releaseWeekday(records: Rec[], meta: Meta) {
  const rel = meta.episodes.filter((e) => e.release_date);
  const early = new Map<string, number>();
  const byEp = groupBy(records, (r) => r.episode);
  for (const e of rel) {
    const rs = byEp.get(e.episode) ?? [];
    const v = sum(rs.filter((r) => daysBetween(e.release_date!, r.date) < 14).map((r) => r.streams));
    early.set(e.episode, v);
  }
  const buckets: { vals: number[]; n: number }[] = WD.map(() => ({ vals: [], n: 0 }));
  for (const e of rel) {
    const wd = (new Date(e.release_date! + "T00:00:00").getDay() + 6) % 7;
    buckets[wd].vals.push(early.get(e.episode) ?? 0);
    buckets[wd].n++;
  }
  const data = WD.map((day, i) => ({
    day,
    value: buckets[i].vals.length ? Math.round(mean(buckets[i].vals)) : 0,
    n: buckets[i].n,
  }));
  const best = [...data].filter((d) => d.n >= 2).sort((a, b) => b.value - a.value)[0];
  return { data, best };
}

// ---- Каденс релизов ----
export function cadence(meta: Meta) {
  const dates = meta.episodes
    .map((e) => e.release_date)
    .filter(Boolean)
    .sort() as string[];
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]));
  const recentGaps = gaps.slice(-20);
  return {
    total: dates.length,
    avgGap: gaps.length ? Math.round(median(gaps) * 10) / 10 : 0,
    recentGap: recentGaps.length ? Math.round(median(recentGaps) * 10) / 10 : 0,
    perMonth: gaps.length ? Math.round((30 / (median(recentGaps) || 1)) * 10) / 10 : 0,
  };
}

// ---- Вечнозелёность: доля стримов после 30 дня ----
export function evergreen(records: Rec[], meta: Meta) {
  const rel = new Map(meta.episodes.map((e) => [e.episode, e.release_date]));
  const short = new Map(meta.episodes.map((e) => [e.episode, e.short]));
  const byEp = groupBy(records, (r) => r.episode);
  const rows: { short: string; tail: number; streams: number }[] = [];
  for (const [ep, rs] of byEp.entries()) {
    const rd = rel.get(ep);
    if (!rd) continue;
    const total = sum(col(rs, "streams"));
    if (total < 20) continue;
    const tail = sum(rs.filter((r) => daysBetween(rd, r.date) >= 30).map((r) => r.streams));
    rows.push({ short: short.get(ep) ?? ep, tail: Math.round((tail / total) * 100), streams: total });
  }
  const top = [...rows].sort((a, b) => b.tail - a.tail).slice(0, 10);
  const avgTail = rows.length ? Math.round(mean(rows.map((r) => r.tail))) : 0;
  return { top, avgTail, n: rows.length };
}

// ---- Сезонность: год × месяц (старты) ----
export function seasonality(records: Rec[]) {
  const years = [...new Set(records.map((r) => r.date.slice(0, 4)))].sort();
  const matrix = years.map((y) =>
    MON.map((_, mi) => {
      const mm = String(mi + 1).padStart(2, "0");
      return sum(records.filter((r) => r.date.slice(0, 4) === y && r.date.slice(5, 7) === mm).map((r) => r.starts));
    })
  );
  return { years, months: MON, matrix };
}

// ---- Топ городов таблицей ----
export function topCities(insightsCity: { points: any[]; mapped_starts: number } | undefined) {
  if (!insightsCity) return [];
  const tot = insightsCity.mapped_starts || 1;
  return insightsCity.points.slice(0, 15).map((p) => ({
    name: p.name,
    starts: p.starts,
    share: Math.round((p.starts / tot) * 1000) / 10,
  }));
}

// ---- Демография во времени (готовые данные из insights) ----
export function demographicsTrend(insights: Insights | null) {
  const t = insights?.demographicsOverTime ?? [];
  return t.filter((x) => x.womenShare != null && x.avgAge != null);
}

// ---- Индекс здоровья (0..100, прозрачная формула) ----
export function healthScore(deltas: ReturnType<typeof periodDeltas>, avgListenPct: number) {
  const conv = (deltas.items.find((i) => i.label === "Конверсия")?.value as number) ?? 0;
  const streamsDelta = deltas.items.find((i) => i.label === "Стримы")?.delta ?? 0;
  const convScore = Math.min(conv / 45, 1) * 100; // 45%+ = максимум
  const complScore = Math.min(avgListenPct / 60, 1) * 100; // 60%+ = максимум
  const trendScore = Math.max(0, Math.min(100, 50 + (streamsDelta ?? 0) * 2));
  const score = Math.round(0.4 * convScore + 0.3 * complScore + 0.3 * trendScore);
  const label =
    score >= 75 ? "Отличное" : score >= 55 ? "Хорошее" : score >= 40 ? "Среднее" : "Требует внимания";
  return { score, label, convScore, complScore, trendScore };
}
