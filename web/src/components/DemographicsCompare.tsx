import { useState } from "react";
import type { DemoScope } from "../lib/data";
import GlassCard from "./GlassCard";
import { SectionTitle, Hint } from "./SectionTitle";
import GenderDonut from "./charts/GenderDonut";
import CategoryBar from "./charts/CategoryBar";
import CityMap from "./charts/CityMap";

type Metric = "starts" | "streams";

function MetricToggle({ metric, onChange }: { metric: Metric; onChange: (m: Metric) => void }) {
  return (
    <div className="metric-toggle">
      <button className={`seg ${metric === "starts" ? "active" : ""}`} onClick={() => onChange("starts")}>
        Старты
      </button>
      <button className={`seg ${metric === "streams" ? "active" : ""}`} onClick={() => onChange("streams")}>
        Стримы
      </button>
    </div>
  );
}

interface Props {
  scope1: DemoScope | null;
  scope2: DemoScope | null;
  label1: string;
  label2: string;
}

export default function DemographicsCompare({ scope1, scope2, label1, label2 }: Props) {
  const [metric, setMetric] = useState<Metric>("starts");

  if (!scope1 || !scope2) return null;

  const age = (s: DemoScope) => s.age.map((a) => ({ name: a.name, value: a[metric] }));

  return (
    <>
      <GlassCard>
        <div className="section-head">
          <SectionTitle>👥 Сравнение аудитории: пол и возраст</SectionTitle>
          <MetricToggle metric={metric} onChange={setMetric} />
        </div>
        <Hint title="Что показывает">
          Портрет аудитории двух выпусков бок о бок. Тумблер меняет метрику.
        </Hint>
        <div className="compare-2col">
          {[
            { s: scope1, label: label1 },
            { s: scope2, label: label2 },
          ].map(({ s, label }, i) => (
            <div key={i} className="compare-col">
              <div className="compare-col__title">{label}</div>
              <GenderDonut data={s.gender} metric={metric} height={260} />
              <div className="demo-subtitle" style={{ marginTop: "0.8rem" }}>Возраст</div>
              <CategoryBar data={age(s)} labelKey="name" valueKey="value" horizontal gradientByValue height={260} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="section-head">
          <SectionTitle>🗺 Сравнение географии</SectionTitle>
          <MetricToggle metric={metric} onChange={setMetric} />
        </div>
        <div className="compare-2col">
          {[
            { s: scope1, label: label1 },
            { s: scope2, label: label2 },
          ].map(({ s, label }, i) => (
            <div key={i} className="compare-col">
              <div className="compare-col__title">{label}</div>
              <CityMap points={s.city.points} metric={metric} height={360} />
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
