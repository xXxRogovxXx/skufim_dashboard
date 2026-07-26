// Загрузка и типизация JSON, экспортированного из Python.

export interface Record {
  date: string;
  episode: string;
  short: string;
  starts: number;
  streams: number;
  avg: number; // Средний_прослушивания (0..100 на этих данных)
  completion: number; // Дослушиваемость
  listeners: number;
  hours: number;
  rsi: number;
  format: string | null;
  genre: string | null;
}

export interface EpisodeMeta {
  episode: string;
  short: string;
  format: string | null;
  genre: string | null;
  duration: string | null;
  category: string | null;
  release_date: string | null;
  ref_release_date: string | null;
}

export interface ImportantDate {
  date: string;
  label: string;
  color: string;
  dash: string;
}

export interface Meta {
  episodes: EpisodeMeta[];
  formats: string[];
  genres: string[];
  date_min: string;
  date_max: string;
  record_count: number;
  episode_count: number;
  important_dates: ImportantDate[];
  generated_at: string;
  version: number;
}

export interface Dataset {
  records: Record[];
  meta: Meta;
}

export async function loadDataset(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL || "/";
  const [records, meta] = await Promise.all([
    fetch(`${base}data/records.json`).then((r) => {
      if (!r.ok) throw new Error(`records.json: ${r.status}`);
      return r.json();
    }),
    fetch(`${base}data/meta.json`).then((r) => {
      if (!r.ok) throw new Error(`meta.json: ${r.status}`);
      return r.json();
    }),
  ]);
  return { records: records as Record[], meta: meta as Meta };
}
