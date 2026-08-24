// Клиентские расчёты для страницы «Инсайты».
import type { Record as Rec, Meta } from "./data";
import { sum, mean, median, groupBy, lifeCurve, daysToPercent } from "./agg";

const col = (rows: Rec[], k: keyof Rec) => rows.map((r) => (r[k] as number) ?? 0);

// Коэффициент корреляции Пирсона
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return 0;
  const mx = mean(xs.slice(0, n)),
    my = mean(ys.slice(0, n));
  let num = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}
const daysBetween = (a: string, b: string) =>
  Math.round((+new Date(b + "T00:00:00") - +new Date(a + "T00:00:00")) / 86400000);

// ---- #3 Жанры во времени (абсолютные старты по месяцам) ----
export function genreOverTime(rows: Rec[]): { data: any[]; genres: string[] } {
  const genres = [...new Set(rows.map((r) => r.genre || "—"))].filter(Boolean);
  const byMonth = groupBy(rows, (r) => r.date.slice(0, 7));
  const data = [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, rs]) => {
      const row: any = { month };
      for (const g of genres) row[g] = 0;
      for (const r of rs) row[r.genre || "—"] += r.starts;
      return row;
    });
  return { data, genres: genres as string[] };
}

// ---- #2 Длительность vs дослушиваемость ----
function durationToMin(d: string | null): number | null {
  if (!d) return null;
  const p = d.split(":").map(Number);
  if (p.some(isNaN)) return null;
  if (p.length === 3) return p[0] * 60 + p[1] + p[2] / 60;
  if (p.length === 2) return p[0] + p[1] / 60;
  return null;
}
export function durationVsCompletion(rows: Rec[], meta: Meta) {
  const byEp = groupBy(rows, (r) => r.episode);
  const durByEp = new Map(meta.episodes.map((e) => [e.episode, durationToMin(e.duration)]));
  const shortByEp = new Map(meta.episodes.map((e) => [e.episode, e.short]));
  const out: any[] = [];
  for (const [ep, rs] of byEp.entries()) {
    const min = durByEp.get(ep);
    if (min == null || min <= 0) continue;
    const st = sum(col(rs, "streams"));
    if (st <= 0) continue;
    // дослушиваемость, взвешенная по стримам
    const wc = sum(rs.map((r) => (r.completion ?? 0) * (r.streams ?? 0))) / st;
    out.push({
      short: shortByEp.get(ep) ?? ep,
      minutes: Math.round(min),
      completion: Math.round(wc * 1000) / 10, // %
      starts: sum(col(rs, "starts")),
    });
  }
  return out;
}

// ---- #7 Агрегированная кривая жизни ----
export function lifeCurveAggregate(rows: Rec[], meta: Meta) {
  const byEp = groupBy(rows, (r) => r.episode);
  const relByEp = new Map(meta.episodes.map((e) => [e.episode, e.release_date]));
  const MAXD = 60;
  const sums = new Array(MAXD + 1).fill(0);
  const counts = new Array(MAXD + 1).fill(0);
  const d50s: number[] = [];
  const d90s: number[] = [];
  for (const [ep, rs] of byEp.entries()) {
    const rel = relByEp.get(ep);
    if (!rel) continue;
    if (sum(col(rs, "streams")) < 5) continue; // мелочь не искажает среднее
    const curve = lifeCurve(rs, rel);
    const cmap = new Map(curve.map((c) => [c.day, c.normStreams]));
    let last = 0;
    for (let d = 1; d <= MAXD; d++) {
      if (cmap.has(d)) last = cmap.get(d)!;
      sums[d] += last;
      counts[d] += 1;
    }
    const d50 = daysToPercent(curve, 50);
    const d90 = daysToPercent(curve, 90);
    if (d50 != null) d50s.push(d50);
    if (d90 != null) d90s.push(d90);
  }
  const curve = [];
  for (let d = 1; d <= MAXD; d++)
    curve.push({ day: d, avgNorm: counts[d] ? Math.round((sums[d] / counts[d]) * 10) / 10 : 0 });
  return { curve, medD50: median(d50s), medD90: median(d90s), n: counts[1] };
}

// ---- #8 Концентрация (кривая Лоренца + Джини) ----
export function concentration(rows: Rec[]) {
  const byEp = groupBy(rows, (r) => r.episode);
  const vals = [...byEp.values()].map((rs) => sum(col(rs, "streams"))).filter((v) => v > 0);
  vals.sort((a, b) => a - b);
  const n = vals.length;
  const total = sum(vals);
  const lorenz: { x: number; y: number; equality: number }[] = [{ x: 0, y: 0, equality: 0 }];
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += vals[i];
    lorenz.push({
      x: Math.round(((i + 1) / n) * 1000) / 10,
      y: Math.round((cum / total) * 1000) / 10,
      equality: Math.round(((i + 1) / n) * 1000) / 10,
    });
  }
  // Джини
  let g = 0;
  for (let i = 0; i < n; i++) g += (2 * (i + 1) - n - 1) * vals[i];
  const gini = total > 0 ? g / (n * total) : 0;
  // доля топ-10% и топ-20%
  const desc = [...vals].sort((a, b) => b - a);
  const share = (p: number) =>
    Math.round((sum(desc.slice(0, Math.ceil(n * p))) / total) * 1000) / 10;
  return { lorenz, gini: Math.round(gini * 100) / 100, top10: share(0.1), top20: share(0.2), n };
}

// ---- #10 Прогноз стримов (недельно, линейная экстраполяция) ----
function weekKey(date: string): string {
  const d = new Date(date + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // пн=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
export function forecastStreams(rows: Rec[], weeksAhead = 6) {
  const byWeek = groupBy(rows, (r) => weekKey(r.date));
  const weeks = [...byWeek.entries()]
    .map(([w, rs]) => ({ week: w, streams: sum(col(rs, "streams")) }))
    .sort((a, b) => a.week.localeCompare(b.week));
  // отбросим неполную последнюю неделю (часто занижена)
  const hist = weeks.slice(0, -1);
  const fitN = Math.min(12, hist.length);
  const fit = hist.slice(-fitN);
  const xs = fit.map((_, i) => i);
  const ys = fit.map((w) => w.streams);
  const mx = mean(xs),
    my = mean(ys);
  let num = 0,
    den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const data: any[] = hist.map((w) => ({ week: w.week, actual: w.streams, forecast: null }));
  const lastWeek = new Date((fit[fit.length - 1]?.week ?? hist[hist.length - 1].week) + "T00:00:00");
  // соединяем: последняя фактическая точка = старт прогноза
  if (data.length) data[data.length - 1].forecast = data[data.length - 1].actual;
  for (let k = 1; k <= weeksAhead; k++) {
    const d = new Date(lastWeek);
    d.setDate(d.getDate() + 7 * k);
    const val = Math.max(0, Math.round(intercept + slope * (fitN - 1 + k)));
    data.push({ week: d.toISOString().slice(0, 10), actual: null, forecast: val });
  }
  return { data, slope: Math.round(slope) };
}

// ---- #11 Momentum: свежие выпуски над/под ожиданием ----
export function momentum(rows: Rec[], meta: Meta, window = 14, recent = 15) {
  const byEp = groupBy(rows, (r) => r.episode);
  const relByEp = new Map(meta.episodes.map((e) => [e.episode, e.release_date]));
  const shortByEp = new Map(meta.episodes.map((e) => [e.episode, e.short]));
  const maxDate = rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0]?.date ?? "");
  const early: { ep: string; rel: string; val: number; mature: boolean }[] = [];
  for (const [ep, rs] of byEp.entries()) {
    const rel = relByEp.get(ep);
    if (!rel) continue;
    const val = sum(rs.filter((r) => daysBetween(rel, r.date) < window).map((r) => r.streams));
    const mature = daysBetween(rel, maxDate) >= window;
    early.push({ ep, rel, val, mature });
  }
  const expected = median(early.filter((e) => e.mature && e.val > 0).map((e) => e.val)) || 1;
  return early
    .sort((a, b) => b.rel.localeCompare(a.rel))
    .slice(0, recent)
    .map((e) => ({
      short: shortByEp.get(e.ep) ?? e.ep,
      residual: Math.round((e.val / expected - 1) * 100),
      actual: e.val,
      partial: !e.mature,
    }))
    .reverse();
}
