// Прозрачный предсказатель метрик выпуска по похожим историческим выпускам.
//
// Идея: настоящего ML на ~180 выпусках не выйдет (переобучится и будет врать
// «точными» числами). Поэтому — интерпретируемая модель ближайших соседей:
// по теме + подтеме + длительности находим сопоставимые прошлые выпуски и
// выдаём ДИАПАЗОН (P25 / медиана / P75), а не одну ложно-точную цифру.
//
// Окно прогноза — первые 2 дня жизни выпуска («старт»): это быстрый сигнал и
// именно то окно, на котором мы сравнивали выпуски в анализе.

import type { Record as Rec, Meta } from "./data";

export const LAUNCH_WINDOW_DAYS = 2;

export interface EpisodeFeature {
  episode: string;
  short: string;
  genre: string | null;
  category: string | null;
  durationMin: number | null;
  releaseDate: string | null;
  // launch-метрики (первые N дней)
  starts: number;
  streams: number;
  conversion: number; // streams/starts, 0..1
  completion: number; // дослушиваемость, 0..1
}

export interface PredInput {
  genre: string;
  category: string | null; // null = «любая»
  durationMin: number;
}

export interface Band {
  p25: number;
  p50: number;
  p75: number;
}

export interface PredResult {
  starts: Band;
  streams: Band;
  conversion: Band;
  completion: Band;
  neff: number; // эффективный размер выборки
  used: number; // сколько выпусков реально повлияло (вес > порога)
  confidence: "high" | "medium" | "low";
  comparables: { f: EpisodeFeature; weight: number }[];
  baseline: { starts: number; streams: number; completion: number }; // медиана по всем
}

function parseDurationMin(hms: string | null): number | null {
  if (!hms) return null;
  const parts = hms.split(":").map((x) => parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  const [h = 0, m = 0, s = 0] = parts;
  const min = h * 60 + m + s / 60;
  return min > 0 ? min : null;
}

// Собираем признаки + launch-метрики по каждому выпуску (один раз).
export function buildFeatures(records: Rec[], meta: Meta): EpisodeFeature[] {
  // дебют выпуска = минимальная дата
  const debut = new Map<string, string>();
  for (const r of records) {
    const cur = debut.get(r.episode);
    if (!cur || r.date < cur) debut.set(r.episode, r.date);
  }

  // агрегируем первые LAUNCH_WINDOW_DAYS дней
  const agg = new Map<
    string,
    { starts: number; streams: number; wComp: number; wStreams: number }
  >();
  for (const r of records) {
    const d0 = debut.get(r.episode);
    if (!d0) continue;
    const diff = Math.round(
      (new Date(r.date).getTime() - new Date(d0).getTime()) / 86400000
    );
    if (diff < 0 || diff >= LAUNCH_WINDOW_DAYS) continue;
    const a = agg.get(r.episode) ?? { starts: 0, streams: 0, wComp: 0, wStreams: 0 };
    const st = r.streams ?? 0;
    a.starts += r.starts ?? 0;
    a.streams += st;
    a.wComp += (r.completion ?? 0) * st;
    a.wStreams += st;
    agg.set(r.episode, a);
  }

  const out: EpisodeFeature[] = [];
  for (const ep of meta.episodes) {
    const a = agg.get(ep.episode);
    if (!a || a.streams <= 0) continue; // нет launch-данных — не обучаемся на нём
    out.push({
      episode: ep.episode,
      short: ep.short,
      genre: ep.genre,
      category: ep.category,
      durationMin: parseDurationMin(ep.duration),
      releaseDate: ep.release_date,
      starts: a.starts,
      streams: a.streams,
      conversion: a.starts > 0 ? a.streams / a.starts : 0,
      completion: a.wStreams > 0 ? a.wComp / a.wStreams : 0,
    });
  }
  return out;
}

// Взвешенный квантиль.
function weightedQuantile(
  pairs: { v: number; w: number }[],
  q: number
): number {
  const arr = pairs.filter((p) => p.w > 0).sort((a, b) => a.v - b.v);
  const total = arr.reduce((s, p) => s + p.w, 0);
  if (total <= 0) return 0;
  const target = q * total;
  let cum = 0;
  for (const p of arr) {
    cum += p.w;
    if (cum >= target) return p.v;
  }
  return arr[arr.length - 1].v;
}

function band(pairs: { v: number; w: number }[]): Band {
  return {
    p25: weightedQuantile(pairs, 0.25),
    p50: weightedQuantile(pairs, 0.5),
    p75: weightedQuantile(pairs, 0.75),
  };
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const DURATION_BANDWIDTH = 15; // мин — «мягкость» близости по хронометражу
const GENRE_SAME = 1.0;
const GENRE_DIFF = 0.3; // другая тема всё ещё чуть информативна, но слабо
const CATEGORY_BONUS = 1.7; // совпала подтема → усиливаем вес

export function predict(features: EpisodeFeature[], input: PredInput): PredResult {
  const weighted = features.map((f) => {
    let w = f.genre === input.genre ? GENRE_SAME : GENRE_DIFF;
    if (input.category && f.category === input.category) w *= CATEGORY_BONUS;
    if (f.durationMin != null) {
      const dz = (f.durationMin - input.durationMin) / DURATION_BANDWIDTH;
      w *= Math.exp(-0.5 * dz * dz);
    } else {
      w *= 0.4; // длительность неизвестна — штраф
    }
    return { f, weight: w };
  });

  const sumW = weighted.reduce((s, x) => s + x.weight, 0);
  const sumW2 = weighted.reduce((s, x) => s + x.weight * x.weight, 0);
  const neff = sumW2 > 0 ? (sumW * sumW) / sumW2 : 0;
  const used = weighted.filter((x) => x.weight > 0.05).length;

  const p = (sel: (f: EpisodeFeature) => number) =>
    band(weighted.map((x) => ({ v: sel(x.f), w: x.weight })));

  const confidence: PredResult["confidence"] =
    neff >= 8 ? "high" : neff >= 4 ? "medium" : "low";

  const comparables = [...weighted]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  return {
    starts: p((f) => f.starts),
    streams: p((f) => f.streams),
    conversion: p((f) => f.conversion),
    completion: p((f) => f.completion),
    neff,
    used,
    confidence,
    comparables,
    baseline: {
      starts: median(features.map((f) => f.starts)),
      streams: median(features.map((f) => f.streams)),
      completion: median(features.map((f) => f.completion)),
    },
  };
}

// Список подтем, встречавшихся в выбранной теме (для зависимого выпадающего списка).
export function categoriesForGenre(
  features: EpisodeFeature[],
  genre: string
): string[] {
  const set = new Set<string>();
  for (const f of features) {
    if (f.genre === genre && f.category) set.add(f.category);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ru"));
}

export function genreOptions(features: EpisodeFeature[]): string[] {
  const counts = new Map<string, number>();
  for (const f of features) {
    if (f.genre) counts.set(f.genre, (counts.get(f.genre) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}
