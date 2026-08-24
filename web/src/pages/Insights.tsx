import { useMemo } from "react";
import type { Dataset } from "../lib/data";
import { COLORS } from "../theme/tokens";
import {
  genreOverTime,
  durationVsCompletion,
  lifeCurveAggregate,
  concentration,
  forecastStreams,
  momentum,
} from "../lib/insights";
import GlassCard from "../components/GlassCard";
import { SectionTitle, Hint } from "../components/SectionTitle";
import Heatmap from "../components/charts/Heatmap";
import StackedArea from "../components/charts/StackedArea";
import CategoryBar from "../components/charts/CategoryBar";
import BubbleChart from "../components/charts/BubbleChart";
import TimeChart from "../components/charts/TimeChart";

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="verdict">
      <div className="title" style={{ color: color ?? COLORS.accentSoft }}>{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

export default function Insights({ data }: { data: Dataset }) {
  const { records, meta, insights } = data;

  const genreTime = useMemo(() => genreOverTime(records), [records]);
  const durComp = useMemo(() => durationVsCompletion(records, meta), [records, meta]);
  const life = useMemo(() => lifeCurveAggregate(records, meta), [records, meta]);
  const conc = useMemo(() => concentration(records), [records]);
  const fc = useMemo(() => forecastStreams(records), [records]);
  const mom = useMemo(() => momentum(records, meta), [records, meta]);

  if (!insights) {
    return (
      <div>
        <h1 className="page-title">Инсайты</h1>
        <GlassCard hover={false}>
          Данные инсайтов не найдены. Запустите <code>python export_data.py</code>.
        </GlassCard>
      </div>
    );
  }

  const genders = insights.gender_order;
  const ages = insights.age_order;

  // #5 матрица пол×возраст (строки — возраст, столбцы — пол)
  const gaMap = new Map(insights.genderAge.map((x) => [`${x.gender}|${x.age}`, x.starts]));
  const gaMatrix = ages.map((a) => genders.map((g) => gaMap.get(`${g}|${a}`) ?? 0));

  // #1 жанр×возраст (доля внутри жанра)
  const genres = Object.keys(insights.genreDemographics);
  const genreAgeMatrix = genres.map((g) => {
    const m = new Map(insights.genreDemographics[g].age.map((x) => [x.name, x.starts]));
    return ages.map((a) => m.get(a) ?? 0);
  });
  const genreGenderMatrix = genres.map((g) => {
    const m = new Map(insights.genreDemographics[g].gender.map((x) => [x.name, x.starts]));
    return genders.map((gg) => m.get(gg) ?? 0);
  });

  // #4 дослушиваемость по возрасту
  const compByAge = insights.completionByAge
    .filter((x) => x.completion != null)
    .map((x) => ({ name: x.name, value: x.completion as number }));

  // #11 momentum — цвет по знаку
  const momPalette = mom.map((m) => (m.residual >= 0 ? COLORS.success : COLORS.danger));

  return (
    <div>
      <h1 className="page-title">Инсайты</h1>
      <div className="page-sub">Глубокие срезы: аудитория · контент · каталог · прогноз</div>

      {/* ---- ПОРТРЕТ ЯДРА: пол × возраст ---- */}
      <GlassCard>
        <SectionTitle>🧬 Портрет ядра: пол × возраст</SectionTitle>
        <Hint title="Как читать">Ячейка — число стартов. Ярче = больше. Видно, где сосредоточено ядро.</Hint>
        <Heatmap rows={ages} cols={genders} matrix={gaMatrix} normalize="global" />
      </GlassCard>

      {/* ---- ДОСЛУШИВАЕМОСТЬ ПО ВОЗРАСТУ ---- */}
      <GlassCard>
        <SectionTitle>🎯 Дослушиваемость по возрасту</SectionTitle>
        <Hint title="Инсайт">
          По полу дослушиваемость почти не отличается (
          {insights.completionByGender.map((g) => `${g.name.toLowerCase()} ${g.completion}%`).join(" · ")}
          ), а по возрасту — заметный градиент.
        </Hint>
        <CategoryBar data={compByAge} labelKey="name" valueKey="value" horizontal gradientByValue
          valueFormatter={(v) => `${v}%`} height={300} />
      </GlassCard>

      {/* ---- ЖАНР × ДЕМОГРАФИЯ ---- */}
      <GlassCard>
        <SectionTitle>🎭 Жанр × возраст (доля внутри жанра)</SectionTitle>
        <Hint title="Как читать">В каждой строке — распределение аудитории жанра по возрасту (%). Какие темы моложе/старше.</Hint>
        <Heatmap rows={genres} cols={ages} matrix={genreAgeMatrix} normalize="row" asPercent />
      </GlassCard>
      <GlassCard>
        <SectionTitle>🎭 Жанр × пол (доля внутри жанра)</SectionTitle>
        <Hint title="Как читать">Какие жанры притягивают больше женщин/мужчин.</Hint>
        <Heatmap rows={genres} cols={genders} matrix={genreGenderMatrix} normalize="row" asPercent />
      </GlassCard>

      {/* ---- ДЛИТЕЛЬНОСТЬ vs ДОСЛУШИВАЕМОСТЬ ---- */}
      <GlassCard>
        <SectionTitle>⏱ Длительность vs дослушиваемость</SectionTitle>
        <Hint title="Как читать">Каждый кружок — выпуск. По X — минуты, по Y — дослушиваемость, размер — старты. Есть ли «оптимальная длина».</Hint>
        <BubbleChart data={durComp} xKey="minutes" yKey="completion" sizeKey="starts"
          colorKey="completion" labelKey="short" xLabel="Минуты" yLabel="Дослушиваемость %"
          colorLabel="Дослуш. %" height={420} />
      </GlassCard>

      {/* ---- ЖАНРЫ ВО ВРЕМЕНИ ---- */}
      <GlassCard>
        <SectionTitle>📈 Жанры во времени (старты по месяцам)</SectionTitle>
        <Hint title="Как читать">Из чего складывается охват каждый месяц — какой контент вытягивает.</Hint>
        <StackedArea data={genreTime.data} xKey="month" keys={genreTime.genres} />
      </GlassCard>

      {/* ---- АГРЕГИРОВАННАЯ КРИВАЯ ЖИЗНИ ---- */}
      <GlassCard>
        <SectionTitle>🌱 Средняя кривая жизни выпуска</SectionTitle>
        <Hint title="Как читать">Усреднённый по каталогу набор прослушиваний со дня релиза (% от финала).</Hint>
        <TimeChart data={life.curve} xKey="day" xType="number" height={320}
          marks={[{ type: "area", key: "avgNorm", name: "Накоплено, % (среднее)", color: COLORS.streams }]}
          hRefs={[
            { y: 50, color: COLORS.warning, label: "50%" },
            { y: 90, color: COLORS.success, label: "90%" },
          ]} />
        <div className="grid-3" style={{ marginTop: 14 }}>
          <Stat label="Медиана дней до 50%" value={life.medD50 ? `${Math.round(life.medD50)}` : "—"} color={COLORS.warning} />
          <Stat label="Медиана дней до 90%" value={life.medD90 ? `${Math.round(life.medD90)}` : "—"} color={COLORS.success} />
          <Stat label="Выпусков в расчёте" value={`${life.n}`} />
        </div>
      </GlassCard>

      {/* ---- КОНЦЕНТРАЦИЯ ---- */}
      <GlassCard>
        <SectionTitle>📊 Концентрация аудитории (кривая Лоренца)</SectionTitle>
        <Hint title="Как читать">Насколько шоу зависит от хитов. Чем сильнее синяя линия провисает под диагональю — тем выше концентрация.</Hint>
        <TimeChart data={conc.lorenz} xKey="x" xType="number" height={320}
          marks={[
            { type: "line", key: "equality", name: "Равномерно", color: COLORS.textFaint, dash: "dash" },
            { type: "area", key: "y", name: "Факт (доля прослушиваний)", color: COLORS.accent },
          ]}
          leftLabel="% прослушиваний" />
        <div className="grid-3" style={{ marginTop: 14 }}>
          <Stat label="Индекс Джини" value={`${conc.gini}`} />
          <Stat label="Топ-10% выпусков дают" value={`${conc.top10}%`} color={COLORS.streams} />
          <Stat label="Топ-20% выпусков дают" value={`${conc.top20}%`} color={COLORS.warning} />
        </div>
      </GlassCard>

      {/* ---- ПРОГНОЗ ---- */}
      <GlassCard>
        <SectionTitle>🔮 Прогноз стримов (недельно)</SectionTitle>
        <Hint title="Как читать">Сплошная — факт, пунктир — линейная экстраполяция тренда на 6 недель вперёд.</Hint>
        <TimeChart data={fc.data} xKey="week" height={320}
          marks={[
            { type: "area", key: "actual", name: "Факт", color: COLORS.streams },
            { type: "line", key: "forecast", name: "Прогноз", color: COLORS.accentSoft, dash: "dash" },
          ]} />
        <div className="coverage-note">
          Тренд: {fc.slope >= 0 ? "+" : ""}{fc.slope} стримов/неделю (по последним 12 неделям). Простая экстраполяция, без учёта сезонности.
        </div>
      </GlassCard>

      {/* ---- MOMENTUM ---- */}
      <GlassCard>
        <SectionTitle>🚀 Momentum свежих выпусков</SectionTitle>
        <Hint title="Как читать">
          Насколько стримы выпуска за первые 2 недели выше/ниже медианы каталога. Зелёные — «выстрелили», красные — недобрали. ⚠️ у самых свежих окно ещё неполное.
        </Hint>
        <CategoryBar data={mom} labelKey="short" valueKey="residual" horizontal palette={momPalette}
          valueFormatter={(v) => `${v >= 0 ? "+" : ""}${v}%`} height={Math.max(320, mom.length * 26)} />
      </GlassCard>
    </div>
  );
}
