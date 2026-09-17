// Индекс успешности выпуска (ИУВ) — заменяет RSI.
//
// RSI мерил «размер» (стримы·конверсия). ИУВ мерит УСПЕХ по двум осям:
//   • Охват    — сколько людей пришло (стримы),
//   • Удержание — сколько из них досмотрело (дослушиваемость).
// Оба показателя берутся за фиксированное окно (первые 10 дней жизни выпуска)
// и делятся на ТИПИЧНЫЕ значения выпусков того же периода (±45 дней) — так
// метрика учитывает, что шоу со временем растёт/сжимается. Удержание весит
// больше охвата, поэтому «пустой» вирус (много начали, почти все ушли) высокий
// балл не получит.
//
//   Охват×    = стримы(10 дн) / медиана стримов выпусков ±45 дней
//   Удержание× = дослушиваемость(10 дн) / медиана дослушиваемости ±45 дней
//   ИУВ = 100 · Охват×^0.4 · Удержание×^0.6      (множители зажаты в 0.2..3.0)
//
//   100 = ровно типичный выпуск своего времени.

import type { Record as Rec, Meta } from "./data";

export const IUV_WINDOW_DAYS = 10;
export const IUV_COHORT_DAYS = 45;
const W_REACH = 0.4;
const W_RET = 0.6;
const REL_MIN = 0.2;
const REL_MAX = 3.0;

// Пояснения для UI (пишем рядом с метрикой везде, где она показана).
export const IUV_HOW =
  "ИУВ = 100 · Охват^0.4 · Удержание^0.6. Охват — стримы выпуска за первые 10 дней, делённые на типичные стримы выпусков того же периода (±45 дней); Удержание — так же по дослушиваемости. 100 = типичный выпуск своего времени.";
export const IUV_MEANS =
  "Выше 100 — успешнее нормы своего времени, ниже — слабее. Удержание весит больше охвата, поэтому большой, но «пустой» охват (мало досмотрели) высокий балл не даёт.";
export const IUV_TITLE = "ИУВ — индекс успешности выпуска";

export interface IuvInfo {
  iuv: number;
  reachRel: number;
  retRel: number;
  streams: number; // стримы в окне
  completion: number; // дослушиваемость в окне (0..1)
  days: number; // сколько дней реально учтено (== окну, либо возраст для свежих)
  provisional: boolean; // выпуск моложе окна — оценка предварительная
}

interface EpCum {
  debut: string;
  age: number;
  // кумулятивные суммы по первым k дням, k = 0..WINDOW
  cumStreams: number[];
  cumCompNum: number[]; // Σ(дослушиваемость·стримы)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function clip(x: number): number {
  return Math.max(REL_MIN, Math.min(REL_MAX, x));
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Построить карту выпуск → ИУВ. Считается один раз из ПОЛНЫХ (не фильтрованных)
// записей: успешность — свойство выпуска, оно не зависит от выбранного периода.
export function buildIuvMap(records: Rec[], meta: Meta): Map<string, IuvInfo> {
  const maxDate = meta.date_max;

  // дебют каждого выпуска
  const debut = new Map<string, string>();
  for (const r of records) {
    const cur = debut.get(r.episode);
    if (!cur || r.date < cur) debut.set(r.episode, r.date);
  }

  // кумулятивные метрики первых WINDOW дней
  const cum = new Map<string, EpCum>();
  for (const [ep, d0] of debut) {
    cum.set(ep, {
      debut: d0,
      age: daysBetween(d0, maxDate) + 1,
      cumStreams: new Array(IUV_WINDOW_DAYS + 1).fill(0),
      cumCompNum: new Array(IUV_WINDOW_DAYS + 1).fill(0),
    });
  }
  for (const r of records) {
    const c = cum.get(r.episode)!;
    const off = daysBetween(c.debut, r.date);
    if (off < 0 || off >= IUV_WINDOW_DAYS) continue;
    const st = r.streams ?? 0;
    // прибавляем в кумулятив со дня off и до конца окна
    for (let k = off + 1; k <= IUV_WINDOW_DAYS; k++) {
      c.cumStreams[k] += st;
      c.cumCompNum[k] += (r.completion ?? 0) * st;
    }
  }

  const metricAt = (c: EpCum, d: number) => {
    const s = c.cumStreams[d];
    return { streams: s, completion: s > 0 ? c.cumCompNum[d] / s : 0 };
  };

  const entries = [...cum.entries()].filter(([, c]) => c.cumStreams[Math.min(IUV_WINDOW_DAYS, c.age)] > 0);
  const out = new Map<string, IuvInfo>();

  for (const [ep, c] of entries) {
    const d = Math.min(IUV_WINDOW_DAYS, c.age);
    const m = metricAt(c, d);
    // когорта: выпуски в пределах ±COHORT дней по дебюту, измеренные на ТОМ ЖЕ окне d
    let cohort = entries.filter(
      ([e2, c2]) => e2 !== ep && Math.abs(daysBetween(c2.debut, c.debut)) <= IUV_COHORT_DAYS
    );
    if (cohort.length < 4) cohort = entries.filter(([e2]) => e2 !== ep);
    const baseR = median(cohort.map(([, c2]) => metricAt(c2, d).streams)) || 1;
    const baseQ = median(cohort.map(([, c2]) => metricAt(c2, d).completion)) || 0.01;

    const reachRel = clip(m.streams / baseR);
    const retRel = clip((m.completion || 0.001) / baseQ);
    const iuv = 100 * Math.pow(reachRel, W_REACH) * Math.pow(retRel, W_RET);

    out.set(ep, {
      iuv,
      reachRel,
      retRel,
      streams: m.streams,
      completion: m.completion,
      days: d,
      provisional: c.age < IUV_WINDOW_DAYS,
    });
  }
  return out;
}

export function iuvColor(score: number): string {
  if (score >= 140) return "#22C55E"; // хит
  if (score >= 115) return "#84CC16"; // выше среднего
  if (score >= 90) return "#F59E0B"; // типичный
  if (score >= 70) return "#FB923C"; // слабоват
  return "#EF4444"; // пресный
}

export function iuvBand(score: number): string {
  if (score >= 140) return "Хит";
  if (score >= 115) return "Выше среднего";
  if (score >= 90) return "Типичный";
  if (score >= 70) return "Слабоват";
  return "Пресный";
}

export function meanIuv(map: Map<string, IuvInfo>, episodes: Iterable<string>): number {
  let s = 0;
  let n = 0;
  const seen = new Set<string>();
  for (const ep of episodes) {
    if (seen.has(ep)) continue;
    seen.add(ep);
    const info = map.get(ep);
    if (info) {
      s += info.iuv;
      n++;
    }
  }
  return n ? s / n : 0;
}
