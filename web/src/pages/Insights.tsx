import { useMemo, type ReactNode } from "react";
import type { Dataset } from "../lib/data";
import { COLORS } from "../theme/tokens";
import {
  genreOverTime,
  durationVsCompletion,
  lifeCurveAggregate,
  concentration,
  forecastStreams,
  momentum,
  pearson,
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

function Takeaway({ children }: { children: ReactNode }) {
  return (
    <div className="takeaway">
      <span className="takeaway__tag">📌 Вывод</span>
      <span>{children}</span>
    </div>
  );
}

const AGE_MID: { [k: string]: number } = {
  "0-17": 12, "18-24": 21, "25-34": 29, "35-44": 39, "45-54": 49, "55-99": 65,
};

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

  // #5 матрица пол×возраст
  const gaMap = new Map(insights.genderAge.map((x) => [`${x.gender}|${x.age}`, x.starts]));
  const gaMatrix = ages.map((a) => genders.map((g) => gaMap.get(`${g}|${a}`) ?? 0));

  // #1 жанр×возраст / жанр×пол
  const genres = Object.keys(insights.genreDemographics);
  const genreAgeMatrix = genres.map((g) => {
    const m = new Map(insights.genreDemographics[g].age.map((x) => [x.name, x.starts]));
    return ages.map((a) => m.get(a) ?? 0);
  });
  const genreGenderMatrix = genres.map((g) => {
    const m = new Map(insights.genreDemographics[g].gender.map((x) => [x.name, x.starts]));
    return genders.map((gg) => m.get(gg) ?? 0);
  });

  // #4
  const compByAge = insights.completionByAge
    .filter((x) => x.completion != null)
    .map((x) => ({ name: x.name, value: x.completion as number }));

  const momPalette = mom.map((m) => (m.residual >= 0 ? COLORS.success : COLORS.danger));

  // ===== ДИНАМИЧЕСКИЕ ВЫВОДЫ =====
  const gaTotal = gaMatrix.flat().reduce((a, b) => a + b, 0) || 1;
  let gaMax = { v: 0, a: "", g: "" };
  ages.forEach((a, i) => genders.forEach((g, j) => {
    if (gaMatrix[i][j] > gaMax.v && g !== "Не определен" && a !== "Не определен")
      gaMax = { v: gaMatrix[i][j], a, g };
  }));
  const coreOut = `Ядро аудитории — ${gaMax.g.toLowerCase()} ${gaMax.a}: это ${Math.round((gaMax.v / gaTotal) * 100)}% всех стартов. На эту группу и стоит опираться в контенте и рекламе.`;

  const cSorted = [...compByAge].sort((a, b) => b.value - a.value);
  const cBest = cSorted[0], cWorst = cSorted[cSorted.length - 1];
  const complOut = cBest && cWorst
    ? `Лучше всех дослушивают ${cBest.name} (${cBest.value}%), заметно хуже — ${cWorst.name} (${cWorst.value}%), разрыв ${Math.round(cBest.value - cWorst.value)} п.п. По полу разницы почти нет — решает возраст, а не пол.`
    : "";

  const meanAge = (g: string) => {
    const arr = insights.genreDemographics[g].age;
    let num = 0, den = 0;
    arr.forEach((x) => { const mid = AGE_MID[x.name]; if (mid) { num += mid * x.starts; den += x.starts; } });
    return den ? num / den : 0;
  };
  const gByAge = [...genres].filter((g) => meanAge(g) > 0).sort((a, b) => meanAge(a) - meanAge(b));
  const genreAgeOut = gByAge.length >= 2
    ? `Самая молодая аудитория у «${gByAge[0]}» (средний возраст ~${Math.round(meanAge(gByAge[0]))}), самая возрастная — у «${gByAge[gByAge.length - 1]}» (~${Math.round(meanAge(gByAge[gByAge.length - 1]))}).`
    : "";

  const femShare = (g: string) => {
    const arr = insights.genreDemographics[g].gender;
    const tot = arr.reduce((s, x) => s + x.starts, 0) || 1;
    return ((arr.find((x) => x.name === "Женщины")?.starts ?? 0) / tot) * 100;
  };
  const gByFem = [...genres].sort((a, b) => femShare(b) - femShare(a));
  const genreGenderOut = gByFem.length >= 2
    ? `Больше всего женщин притягивает «${gByFem[0]}» (${Math.round(femShare(gByFem[0]))}% жен.), самая мужская тема — «${gByFem[gByFem.length - 1]}» (жен. лишь ${Math.round(femShare(gByFem[gByFem.length - 1]))}%).`
    : "";

  const durR = pearson(durComp.map((d) => d.minutes), durComp.map((d) => d.completion));
  const durOut = durComp.length < 5
    ? "Пока мало выпусков с известной длительностью для надёжного вывода."
    : Math.abs(durR) < 0.15
      ? `Длина выпуска почти не влияет на дослушиваемость (корреляция ${durR.toFixed(2)}) — можно не бояться длинных форматов.`
      : durR < 0
        ? `Чем длиннее выпуск, тем ниже дослушиваемость (корреляция ${durR.toFixed(2)}) — длинные теряют слушателя, стоит следить за хронометражем.`
        : `Длинные выпуски дослушивают даже лучше (корреляция ${durR.toFixed(2)}) — аудитория готова к глубокому контенту.`;

  const genreOut = (() => {
    const totals: { [k: string]: number } = {};
    genreTime.genres.forEach((g) => (totals[g] = 0));
    genreTime.data.forEach((row) => genreTime.genres.forEach((g) => (totals[g] += row[g] || 0)));
    const dom = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0];
    const share = (rows: any[], g: string) => {
      let s = 0, t = 0;
      rows.forEach((r) => { s += r[g] || 0; genreTime.genres.forEach((gg) => (t += r[gg] || 0)); });
      return t ? s / t : 0;
    };
    const recent = genreTime.data.slice(-3), prev = genreTime.data.slice(-6, -3);
    let grow = { g: "", d: -Infinity };
    genreTime.genres.forEach((g) => {
      if (g === dom) return; // растущий ищем среди прочих, чтобы не дублировать доминанта
      const d = share(recent, g) - share(prev, g);
      if (d > grow.d) grow = { g, d };
    });
    const growPart = grow.g && grow.d > 0
      ? ` В последние месяцы среди остальных заметнее всего растёт доля «${grow.g}» — на этот формат стоит присмотреться.`
      : "";
    return `Основа охвата — «${dom}» (${Math.round(share(genreTime.data, dom) * 100)}% стартов за всё время).${growPart}`;
  })();

  const lifeOut = `Половина всех прослушиваний набирается за ~${Math.round(life.medD50)} дней, 90% — только за ~${Math.round(life.medD90)}. ${life.medD90 > 45 ? "Каталог «вечнозелёный»: выпуски долго докручивают аудиторию — старые выпуски всё ещё работают." : "Выпуски отыгрывают своё быстро — важен момент релиза."}`;

  const concOut = `Топ‑10% выпусков дают ${conc.top10}% всех прослушиваний (индекс Джини ${conc.gini}) — ${conc.top10 > 40 ? "высокая" : conc.top10 > 25 ? "умеренная" : "низкая"} зависимость от хитов. ${conc.top10 > 40 ? "Один-два удачных выпуска сильно двигают статистику." : "Аудитория распределена относительно ровно между выпусками."}`;

  const lastFc = [...fc.data].reverse().find((d) => d.forecast != null)?.forecast;
  const fcOut = `Тренд ${fc.slope >= 0 ? `растёт (+${fc.slope}` : `снижается (${fc.slope}`} стримов/нед). При сохранении темпа через 6 недель — около ${lastFc} стримов/нед. ${fc.slope < 0 ? "Нужен приток (фичеринг, коллаборации), чтобы развернуть тренд." : "Динамика позитивная — держим темп."}`;

  const pos = mom.filter((m) => m.residual >= 0).length;
  const mBest = [...mom].sort((a, b) => b.residual - a.residual)[0];
  const mWorst = [...mom].sort((a, b) => a.residual - b.residual)[0];
  const momOut = mom.length
    ? `${pos} из ${mom.length} свежих выпусков — выше медианы каталога. Ярче всех «${mBest.short}» (${mBest.residual >= 0 ? "+" : ""}${mBest.residual}%), слабее всех «${mWorst.short}» (${mWorst.residual}%). Смотрите, что сработало у лидера — тему, гостя, обложку.`
    : "";

  return (
    <div>
      <h1 className="page-title">Инсайты</h1>
      <div className="page-sub">Глубокие срезы: аудитория · контент · каталог · прогноз</div>

      <GlassCard>
        <SectionTitle>🧬 Портрет ядра: пол × возраст</SectionTitle>
        <Hint title="Как читать">Ячейка — число стартов. Ярче = больше. Видно, где сосредоточено ядро.</Hint>
        <Heatmap rows={ages} cols={genders} matrix={gaMatrix} normalize="global" />
        <Takeaway>{coreOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>🎯 Дослушиваемость по возрасту</SectionTitle>
        <Hint title="Как читать">Взвешено по стримам. По полу дослушиваемость почти одинакова, поэтому смотрим возраст.</Hint>
        <CategoryBar data={compByAge} labelKey="name" valueKey="value" horizontal gradientByValue
          valueFormatter={(v) => `${v}%`} height={300} />
        <Takeaway>{complOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>🎭 Жанр × возраст (доля внутри жанра)</SectionTitle>
        <Hint title="Как читать">В каждой строке — распределение аудитории жанра по возрасту (%).</Hint>
        <Heatmap rows={genres} cols={ages} matrix={genreAgeMatrix} normalize="row" asPercent />
        <Takeaway>{genreAgeOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>🎭 Жанр × пол (доля внутри жанра)</SectionTitle>
        <Hint title="Как читать">Какие жанры притягивают больше женщин/мужчин.</Hint>
        <Heatmap rows={genres} cols={genders} matrix={genreGenderMatrix} normalize="row" asPercent />
        <Takeaway>{genreGenderOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>⏱ Длительность vs дослушиваемость</SectionTitle>
        <Hint title="Как читать">Кружок — выпуск. X — минуты, Y — дослушиваемость, размер — старты.</Hint>
        <BubbleChart data={durComp} xKey="minutes" yKey="completion" sizeKey="starts"
          colorKey="completion" labelKey="short" xLabel="Минуты" yLabel="Дослушиваемость %"
          colorLabel="Дослуш. %" height={420} />
        <Takeaway>{durOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>📈 Жанры во времени (старты по месяцам)</SectionTitle>
        <Hint title="Как читать">Из чего складывается охват каждый месяц.</Hint>
        <StackedArea data={genreTime.data} xKey="month" keys={genreTime.genres} />
        <Takeaway>{genreOut}</Takeaway>
      </GlassCard>

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
        <Takeaway>{lifeOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>📊 Концентрация аудитории (кривая Лоренца)</SectionTitle>
        <Hint title="Как читать">Насколько шоу зависит от хитов. Чем сильнее линия провисает под диагональю — тем выше концентрация.</Hint>
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
        <Takeaway>{concOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>🔮 Прогноз стримов (недельно)</SectionTitle>
        <Hint title="Как читать">Сплошная — факт, пунктир — экстраполяция тренда на 6 недель вперёд.</Hint>
        <TimeChart data={fc.data} xKey="week" height={320}
          marks={[
            { type: "area", key: "actual", name: "Факт", color: COLORS.streams },
            { type: "line", key: "forecast", name: "Прогноз", color: COLORS.accentSoft, dash: "dash" },
          ]} />
        <Takeaway>{fcOut}</Takeaway>
      </GlassCard>

      <GlassCard>
        <SectionTitle>🚀 Momentum свежих выпусков</SectionTitle>
        <Hint title="Как читать">Насколько стримы за первые 2 недели выше/ниже медианы каталога. ⚠️ у самых свежих окно ещё неполное.</Hint>
        <CategoryBar data={mom} labelKey="short" valueKey="residual" horizontal palette={momPalette}
          valueFormatter={(v) => `${v >= 0 ? "+" : ""}${v}%`} height={Math.max(320, mom.length * 26)} />
        <Takeaway>{momOut}</Takeaway>
      </GlassCard>
    </div>
  );
}
