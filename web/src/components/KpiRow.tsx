export interface Kpi {
  icon: string;
  value: string;
  label: string;
}

export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <div className="kpi-row">
      {items.map((k, i) => (
        <div key={i} className="glass glass--hover kpi">
          <div className="kpi__top" />
          <div className="kpi__icon">{k.icon}</div>
          <div className="kpi__value">{k.value}</div>
          <div className="kpi__label">{k.label}</div>
        </div>
      ))}
    </div>
  );
}
