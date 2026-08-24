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

// --- Демография (пол / возраст / город) ---
export interface DemoDim {
  name: string;
  starts: number;
  streams: number;
}
export interface CityPoint {
  name: string;
  starts: number;
  streams: number;
  lon: number;
  lat: number;
}
export interface CityBlock {
  points: CityPoint[];
  total_starts: number;
  total_streams: number;
  mapped_starts: number;
  mapped_streams: number;
}
export interface DemoScope {
  gender: DemoDim[];
  age: DemoDim[];
  city: CityBlock;
}
export interface Demographics {
  meta: {
    gender_order: string[];
    age_order: string[];
    date_min: string;
    date_max: string;
    episode_count: number;
  };
  overall: DemoScope;
  byEpisode: { [episode: string]: DemoScope };
}

export interface Dataset {
  records: Record[];
  meta: Meta;
  demographics: Demographics | null;
  insights: Insights | null;
}

// --- Инсайты (жанр×демо, дослушиваемость по сегментам, кросс пол×возраст) ---
export interface SegComp {
  name: string;
  starts: number;
  streams: number;
  completion: number | null;
  avg: number | null;
}
export interface GenreDemo {
  starts: number;
  gender: { name: string; starts: number }[];
  age: { name: string; starts: number }[];
}
export interface Insights {
  gender_order: string[];
  age_order: string[];
  genderAge: { gender: string; age: string; starts: number; streams: number }[];
  completionByGender: SegComp[];
  completionByAge: SegComp[];
  genreDemographics: { [genre: string]: GenreDemo };
}

export async function loadDataset(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL || "/";
  const optional = (name: string) =>
    fetch(`${base}data/${name}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  const [records, meta, demographics, insights] = await Promise.all([
    fetch(`${base}data/records.json`).then((r) => {
      if (!r.ok) throw new Error(`records.json: ${r.status}`);
      return r.json();
    }),
    fetch(`${base}data/meta.json`).then((r) => {
      if (!r.ok) throw new Error(`meta.json: ${r.status}`);
      return r.json();
    }),
    optional("demographics.json"),
    optional("insights.json"),
  ]);
  return {
    records: records as Record[],
    meta: meta as Meta,
    demographics: demographics as Demographics | null,
    insights: insights as Insights | null,
  };
}
