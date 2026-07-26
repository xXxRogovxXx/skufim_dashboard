// Агрегации — точный порт pandas-логики dashboard.py.
// После fillna(0) в данных нет NaN, поэтому groupby.mean() == sum/count по всем строкам.
import type { Record } from "./data";
import { safeDiv } from "./format";

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
export const mean = (xs: number[]): number => (xs.length ? sum(xs) / xs.length : 0);
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function groupBy<T, K extends string | number>(
  rows: T[],
  keyFn: (r: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return map;
}

const col = (rows: Record[], key: keyof Record): number[] =>
  rows.map((r) => (r[key] as number) ?? 0);

// ------- Фильтрация (страница 1) -------
export interface Filters {
  dateFrom?: string;
  dateTo?: string;
  format?: string; // 'Все' | конкретный
  genre?: string;
}

export function applyFilters(records: Record[], f: Filters): Record[] {
  return records.filter((r) => {
    if (f.dateFrom && r.date < f.dateFrom) return false;
    if (f.dateTo && r.date > f.dateTo) return false;
    if (f.format && f.format !== "Все" && r.format !== f.format) return false;
    if (f.genre && f.genre !== "Все" && r.genre !== f.genre) return false;
    return true;
  });
}

// ------- KPI (dashboard.py:1275) -------
export interface Kpis {
  totalStarts: number;
  totalStreams: number;
  conversion: number;
  uniqueEpisodes: number;
  avgRsi: number;
  avgListen: number; // *100
  totalListeners: number;
  totalHours: number;
  hoursPerListener: number;
  startsPerListener: number;
}

export function computeKpis(rows: Record[]): Kpis {
  const totalStarts = sum(col(rows, "starts"));
  const totalStreams = sum(col(rows, "streams"));
  const totalListeners = sum(col(rows, "listeners"));
  const totalHours = sum(col(rows, "hours"));
  return {
    totalStarts,
    totalStreams,
    conversion: safeDiv(totalStreams, totalStarts) * 100,
    uniqueEpisodes: new Set(rows.map((r) => r.episode)).size,
    avgRsi: mean(col(rows, "rsi")),
    avgListen: mean(col(rows, "avg")) * 100,
    totalListeners,
    totalHours,
    hoursPerListener: safeDiv(totalHours, totalListeners),
    startsPerListener: safeDiv(totalStarts, totalListeners),
  };
}

// ------- Дневная динамика -------
export interface DailyRow {
  date: string;
  starts: number;
  streams: number;
  conversion: number;
  listeners: number;
  hours: number;
}

export function dailySeries(rows: Record[]): DailyRow[] {
  const g = groupBy(rows, (r) => r.date);
  const out: DailyRow[] = [];
  for (const [date, rs] of g) {
    const starts = sum(col(rs, "starts"));
    const streams = sum(col(rs, "streams"));
    out.push({
      date,
      starts,
      streams,
      conversion: safeDiv(streams, starts) * 100,
      listeners: sum(col(rs, "listeners")),
      hours: sum(col(rs, "hours")),
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ------- Активность по дням недели -------
export function weekdaySeries(rows: Record[]): {
  starts: number[];
  streams: number[];
  hours: number[];
} {
  // индексы 0..6 = Пн..Вс
  const starts = new Array(7).fill(0);
  const streams = new Array(7).fill(0);
  const hours = new Array(7).fill(0);
  const jsToMon = [6, 0, 1, 2, 3, 4, 5];
  for (const r of rows) {
    const d = new Date(r.date + "T00:00:00");
    const idx = jsToMon[d.getDay()];
    starts[idx] += r.starts ?? 0;
    streams[idx] += r.streams ?? 0;
    hours[idx] += r.hours ?? 0;
  }
  return { starts, streams, hours };
}

// ------- Агрегаты по выпускам -------
export interface EpisodeAgg {
  episode: string;
  short: string;
  starts: number;
  streams: number;
  avg: number; // mean
  completion: number; // mean
  rsi: number; // mean
  listeners: number;
  hours: number;
  conversion: number;
  format: string | null;
  genre: string | null;
}

export function episodeAggregates(rows: Record[]): EpisodeAgg[] {
  const g = groupBy(rows, (r) => r.episode);
  const out: EpisodeAgg[] = [];
  for (const [episode, rs] of g) {
    const starts = sum(col(rs, "starts"));
    const streams = sum(col(rs, "streams"));
    out.push({
      episode,
      short: rs[0].short,
      starts,
      streams,
      avg: mean(col(rs, "avg")),
      completion: mean(col(rs, "completion")),
      rsi: mean(col(rs, "rsi")),
      listeners: sum(col(rs, "listeners")),
      hours: sum(col(rs, "hours")),
      conversion: safeDiv(streams, starts) * 100,
      format: rs[0].format,
      genre: rs[0].genre,
    });
  }
  return out;
}

// ------- Жанры (dashboard.py:1756) -------
export interface GenreAgg {
  genre: string;
  starts: number;
  streams: number;
  rsi: number;
  completion: number;
  avg: number;
  conversion: number;
}

export function genreAggregates(rows: Record[]): GenreAgg[] {
  const g = groupBy(rows, (r) => r.genre ?? "—");
  const out: GenreAgg[] = [];
  for (const [genre, rs] of g) {
    const starts = sum(col(rs, "starts"));
    const streams = sum(col(rs, "streams"));
    out.push({
      genre,
      starts,
      streams,
      rsi: mean(col(rs, "rsi")),
      completion: mean(col(rs, "completion")),
      avg: mean(col(rs, "avg")),
      conversion: safeDiv(streams, starts) * 100,
    });
  }
  return out;
}

// ------- Pareto по часам (dashboard.py:1601) -------
export interface ParetoRow {
  index: number;
  episode: string;
  hours: number;
  cumPercent: number;
}

export function paretoByHours(rows: Record[]): ParetoRow[] {
  const g = groupBy(rows, (r) => r.episode);
  const perEp = [...g.entries()]
    .map(([episode, rs]) => ({ episode, hours: sum(col(rs, "hours")) }))
    .sort((a, b) => b.hours - a.hours);
  const total = sum(perEp.map((e) => e.hours));
  let cum = 0;
  return perEp.map((e, i) => {
    cum += e.hours;
    return {
      index: i + 1,
      episode: e.episode,
      hours: e.hours,
      cumPercent: safeDiv(cum, total) * 100,
    };
  });
}

// ------- Кривая жизни (dashboard.py:1146) -------
export interface LifeCurveRow {
  day: number;
  streams: number;
  starts: number;
  hours: number;
  cumStreams: number;
  cumStarts: number;
  cumHours: number;
  normStreams: number;
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

export function lifeCurve(rows: Record[], releaseDate: string): LifeCurveRow[] {
  const withDay = rows.map((r) => ({ ...r, day: daysBetween(releaseDate, r.date) + 1 }));
  const g = groupBy(withDay, (r) => r.day);
  const days = [...g.entries()]
    .map(([day, rs]) => ({
      day,
      streams: sum(col(rs, "streams")),
      starts: sum(col(rs, "starts")),
      hours: sum(col(rs, "hours")),
    }))
    .sort((a, b) => a.day - b.day);
  const totalStreams = sum(days.map((d) => d.streams));
  let cs = 0,
    ct = 0,
    ch = 0;
  return days.map((d) => {
    cs += d.streams;
    ct += d.starts;
    ch += d.hours;
    return {
      day: d.day,
      streams: d.streams,
      starts: d.starts,
      hours: d.hours,
      cumStreams: cs,
      cumStarts: ct,
      cumHours: ch,
      normStreams: totalStreams > 0 ? Math.round((cs / totalStreams) * 1000) / 10 : 0,
    };
  });
}

export function daysToPercent(curve: LifeCurveRow[], pct: number): number | null {
  const hit = curve.find((r) => r.normStreams >= pct);
  return hit ? hit.day : null;
}

// ------- Воронка (dashboard.py:1128) -------
export interface Funnel {
  totalStarts: number;
  avgListen: number;
  completion: number;
  stage1: number;
  stage2: number;
  stage3: number;
  hasData: boolean;
}

export function funnelData(rows: Record[]): Funnel {
  const totalStarts = sum(col(rows, "starts"));
  const avgListen = mean(col(rows, "avg"));
  const completion = mean(col(rows, "completion"));
  return {
    totalStarts,
    avgListen,
    completion,
    stage1: totalStarts,
    stage2: totalStarts > 0 ? totalStarts * avgListen : 0,
    stage3: totalStarts > 0 ? totalStarts * completion : 0,
    hasData: totalStarts > 0 && (avgListen > 0 || completion > 0),
  };
}

// ------- Позиция vs среднее (dashboard.py:1102) -------
export interface Position {
  value: number;
  mean: number;
  status: string;
  color: string;
}

const SUM_METRICS = new Set<keyof Record>(["starts", "streams"]);

export function episodePosition(
  episodeRows: Record[],
  allRows: Record[],
  metric: keyof Record
): Position {
  const isSum = SUM_METRICS.has(metric);
  const value = isSum ? sum(col(episodeRows, metric)) : mean(col(episodeRows, metric));
  const perEp = groupBy(allRows, (r) => r.episode);
  const allValues = [...perEp.values()].map((rs) =>
    isSum ? sum(col(rs, metric)) : mean(col(rs, metric))
  );
  const meanValue = mean(allValues);

  let status: string, color: string;
  if (value > meanValue * 1.1) [status, color] = ["🔼 Значительно выше среднего", "#22C55E"];
  else if (value > meanValue) [status, color] = ["🔼 Выше среднего", "#7C3AED"];
  else if (value > meanValue * 0.9) [status, color] = ["➖ На уровне среднего", "#F59E0B"];
  else [status, color] = ["🔽 Ниже среднего", "#EF4444"];

  return { value, mean: meanValue, status, color };
}

// период: релиз + N дней (страницы 2/3)
export function filterPeriod(
  rows: Record[],
  releaseDate: string,
  days: number | null
): Record[] {
  const inRange = rows.filter((r) => r.date >= releaseDate);
  if (days === null) return inRange;
  const end = new Date(new Date(releaseDate + "T00:00:00").getTime() + (days - 1) * 86400000);
  const endIso = end.toISOString().slice(0, 10);
  return inRange.filter((r) => r.date <= endIso);
}
