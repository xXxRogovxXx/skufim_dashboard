import { useMemo, useState } from "react";
import type { Dataset } from "../lib/data";
import { COLORS } from "../theme/tokens";
import { formatNumber, formatDecimal } from "../lib/format";
import {
  buildFeatures,
  predict,
  categoriesForGenre,
  genreOptions,
  LAUNCH_WINDOW_DAYS,
  type Band,
} from "../lib/predict";
import GlassCard from "../components/GlassCard";
import { SectionTitle, Hint } from "../components/SectionTitle";
import Takeaway from "../components/Takeaway";

const CONF_LABEL: Record<string, { text: string; color: string }> = {
  high: { text: "Высокая", color: COLORS.success },
  medium: { text: "Средняя", color: COLORS.warning },
  low: { text: "Низкая", color: COLORS.danger },
};

export default function Predict({ data }: { data: Dataset }) {
  const { records, meta } = data;
  const features = useMemo(() => buildFeatures(records, meta), [records, meta]);
  const genres = useMemo(() => genreOptions(features), [features]);

  const [genre, setGenre] = useState(genres[0] ?? "Фильм");
  const [category, setCategory] = useState<string | null>(null);
  const [duration, setDuration] = useState(35);

  const cats = useMemo(() => categoriesForGenre(features, genre), [features, genre]);
  // если подтема не встречается в выбранной теме — сбрасываем на «любая»
  const effCategory = category && cats.includes(category) ? category : null;

  const res = useMemo(
    () => predict(features, { genre, category: effCategory, durationMin: duration }),
    [features, genre, effCategory, duration]
  );

  const conf = CONF_LABEL[res.confidence];

  // ---- авто-вывод ----
  const startsMid = Math.round(res.starts.p50);
  const complMid = res.completion.p50 * 100;
  const baseStarts = res.baseline.starts;
  const reachWord =
    startsMid >= baseStarts * 1.15
      ? "выше типичного"
      : startsMid <= baseStarts * 0.85
        ? "ниже типичного"
        : "на уровне типичного";
  const complWord =
    complMid >= 55 ? "высокая" : complMid >= 40 ? "средняя" : "невысокая";
  const takeaway =
    res.used < 3
      ? `Слишком мало похожих выпусков (${res.used}) — прогноз ненадёжен. Ослабьте фильтр: уберите подтему или сдвиньте длительность.`
      : `Ожидаемый старт: ~${startsMid} стартов (${reachWord}, медиана по всем ${Math.round(baseStarts)}) при дослушиваемости ~${complMid.toFixed(0)}% (${complWord}). Прогноз опирается на ${res.used} похожих выпусков (эфф. ${res.neff.toFixed(1)}), надёжность — ${conf.text.toLowerCase()}.`;

  return (
    <div>
      <h1 className="page-title">Прогноз выпуска</h1>
      <div className="page-sub">
        Ожидаемые метрики старта по теме, подтеме и длительности · модель «похожих выпусков»
      </div>

      {/* ---- ВВОД ---- */}
      <GlassCard hover={false}>
        <div className="controls-bar">
          <div className="field" style={{ minWidth: 180 }}>
            <label className="control-label">🎬 Тема</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label className="control-label">🏷 Подтема</label>
            <select
              value={effCategory ?? ""}
              onChange={(e) => setCategory(e.target.value || null)}
            >
              <option value="">— любая —</option>
              {cats.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ minWidth: 220, flex: 1 }}>
            <label className="control-label">⏱ Длительность: {duration} мин</label>
            <input
              type="range"
              min={5}
              max={120}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </GlassCard>

      {/* ---- ПРОГНОЗ ---- */}
      <GlassCard>
        <SectionTitle>🔮 Прогноз старта (первые {LAUNCH_WINDOW_DAYS} дня)</SectionTitle>
        <Hint title="Как читать">
          Крупное число — медиана (P50) ожидания. Диапазон — P25–P75: половина похожих
          выпусков попала в эти границы. Это вилка, а не гарантия.
        </Hint>
        <div className="pred-grid">
          <PredCard
            label="Старты"
            band={res.starts}
            color={COLORS.starts}
            base={res.baseline.starts}
            fmt={(v) => formatNumber(v)}
          />
          <PredCard
            label="Стримы"
            band={res.streams}
            color={COLORS.streams}
            base={res.baseline.streams}
            fmt={(v) => formatNumber(v)}
          />
          <PredCard
            label="Конверсия"
            band={res.conversion}
            color={COLORS.conversion}
            fmt={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <PredCard
            label="Дослушиваемость"
            band={res.completion}
            color={COLORS.completion}
            base={res.baseline.completion}
            fmt={(v) => `${(v * 100).toFixed(0)}%`}
          />
        </div>

        <div className="pred-conf">
          <span className="pred-conf__badge" style={{ borderColor: conf.color, color: conf.color }}>
            Надёжность: {conf.text}
          </span>
          <span className="pred-conf__meta">
            похожих выпусков: {res.used} · эффективная выборка: {res.neff.toFixed(1)}
          </span>
        </div>

        <Takeaway>{takeaway}</Takeaway>
      </GlassCard>

      {/* ---- НА ЧЁМ ОСНОВАН ---- */}
      <GlassCard>
        <SectionTitle>🧩 На каких выпусках основан прогноз</SectionTitle>
        <Hint title="Прозрачность">
          Топ-6 наиболее похожих выпусков и их вклад (вес). Чем ближе тема, подтема и
          длительность — тем сильнее выпуск влияет на прогноз.
        </Hint>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Вес</th>
                <th>Выпуск</th>
                <th>Тема / подтема</th>
                <th>Длина</th>
                <th>Старты</th>
                <th>Дослуш.</th>
              </tr>
            </thead>
            <tbody>
              {res.comparables.map(({ f, weight }) => (
                <tr key={f.episode}>
                  <td>{(weight / (res.comparables[0]?.weight || 1) * 100).toFixed(0)}%</td>
                  <td style={{ textAlign: "left" }}>{f.short}</td>
                  <td style={{ textAlign: "left" }}>
                    {f.genre}
                    {f.category ? ` · ${f.category}` : ""}
                  </td>
                  <td>{f.durationMin != null ? `${formatDecimal(f.durationMin, 0)}м` : "—"}</td>
                  <td>{formatNumber(f.starts)}</td>
                  <td>{(f.completion * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard hover={false}>
        <Hint title="Важно про точность">
          Модель обучена на {features.length} выпусках с данными о старте. Это не «настоящий
          ИИ-прогноз», а честная оценка по историческим аналогам: при узком фильтре
          (редкая подтема + нетипичная длина) выборка мала — смотрите на диапазон, а не на
          одно число. Длительность учтена напрямую, поэтому короткие выпуски сравниваются с
          короткими (дослушиваемость у них естественно выше).
        </Hint>
      </GlassCard>
    </div>
  );
}

function PredCard({
  label,
  band,
  color,
  base,
  fmt,
}: {
  label: string;
  band: Band;
  color: string;
  base?: number;
  fmt: (v: number) => string;
}) {
  const delta =
    base != null && base > 0 ? Math.round((band.p50 / base - 1) * 100) : null;
  return (
    <div className="pred-card glass glass--hover">
      <div className="pred-card__top" style={{ background: color }} />
      <div className="pred-card__label">{label}</div>
      <div className="pred-card__value" style={{ color }}>
        {fmt(band.p50)}
      </div>
      <div className="pred-card__range">
        {fmt(band.p25)} – {fmt(band.p75)}
      </div>
      {delta != null && (
        <div
          className="pred-card__delta"
          style={{ color: delta >= 0 ? COLORS.success : COLORS.danger }}
        >
          {delta >= 0 ? "▲ +" : "▼ "}
          {delta}% к медиане
        </div>
      )}
    </div>
  );
}
