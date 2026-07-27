import { useState } from "react";
import type { DemoScope } from "../lib/data";
import GlassCard from "./GlassCard";
import { SectionTitle, Hint } from "./SectionTitle";
import GenderDonut from "./charts/GenderDonut";
import CategoryBar from "./charts/CategoryBar";
import CityMap from "./charts/CityMap";
import { compactNumber } from "./charts/common";

type Metric = "starts" | "streams";

function MetricToggle({
  metric,
  onChange,
}: {
  metric: Metric;
  onChange: (m: Metric) => void;
}) {
  return (
    <div className="metric-toggle">
      <button
        className={`seg ${metric === "starts" ? "active" : ""}`}
        onClick={() => onChange("starts")}
      >
        Старты
      </button>
      <button
        className={`seg ${metric === "streams" ? "active" : ""}`}
        onClick={() => onChange("streams")}
      >
        Стримы
      </button>
    </div>
  );
}

export default function DemographicsSection({ scope }: { scope: DemoScope }) {
  const [metric, setMetric] = useState<Metric>("starts");

  const ageData = scope.age.map((a) => ({ name: a.name, value: a[metric] }));

  const city = scope.city;
  const mapped = metric === "starts" ? city.mapped_starts : city.mapped_streams;
  const total = metric === "starts" ? city.total_starts : city.total_streams;
  const coverage = total > 0 ? Math.round((mapped / total) * 100) : 0;

  return (
    <>
      <GlassCard>
        <div className="section-head">
          <SectionTitle>👥 Аудитория: пол и возраст</SectionTitle>
          <MetricToggle metric={metric} onChange={setMetric} />
        </div>
        <Hint title="Что показывает">
          Слева — распределение по полу, справа — по возрасту. Переключатель
          вверху меняет метрику: старты (запуски) или стримы (прослушивания &gt;2
          мин).
        </Hint>
        <div className="demo-grid">
          <div>
            <div className="demo-subtitle">Пол</div>
            <GenderDonut data={scope.gender} metric={metric} />
          </div>
          <div>
            <div className="demo-subtitle">Возраст</div>
            <CategoryBar
              data={ageData}
              labelKey="name"
              valueKey="value"
              horizontal
              gradientByValue
              height={300}
            />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="section-head">
          <SectionTitle>🗺 География аудитории</SectionTitle>
          <MetricToggle metric={metric} onChange={setMetric} />
        </div>
        <Hint title="Как читать">
          Каждый круг — город, размер пропорционален метрике. Наведите на круг
          для деталей, крутите колесо для зума.
        </Hint>
        <CityMap points={city.points} metric={metric} />
        <div className="coverage-note">
          На карте — {compactNumber(mapped)} из {compactNumber(total)} (
          {coverage}% аудитории с распознанным городом; регионы и страны без
          точной точки на карте не показаны).
        </div>
      </GlassCard>
    </>
  );
}
