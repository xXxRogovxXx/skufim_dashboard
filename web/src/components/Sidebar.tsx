import type { ImportantDate } from "../lib/data";
import { formatDateRu } from "../lib/format";

export type PageId = "overview" | "episode" | "compare";

const NAV: { id: PageId; icon: string; label: string; short: string }[] = [
  { id: "overview", icon: "📊", label: "Общая аналитика", short: "Общая" },
  { id: "episode", icon: "📋", label: "Анализ выпуска", short: "Выпуск" },
  { id: "compare", icon: "🔄", label: "Сравнение выпусков", short: "Сравнить" },
];

interface Props {
  page: PageId;
  onChange: (p: PageId) => void;
  importantDates: ImportantDate[];
}

export default function Sidebar({ page, onChange, importantDates }: Props) {
  return (
    <aside className="sidebar glass" style={{ borderRadius: 22 }}>
      <div className="sidebar__brand">
        <span>🎙️</span>
        <span>Подкаст · Аналитика</span>
      </div>
      <nav>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => onChange(n.id)}
          >
            <span className="nav-item__icon">{n.icon}</span>
            <span className="nav-item__label-full">{n.label}</span>
            <span className="nav-item__label-short">{n.short}</span>
          </button>
        ))}
      </nav>

      {importantDates.length > 0 && (
        <>
          <div className="sidebar__section">📅 Важные даты</div>
          {importantDates.map((d) => (
            <div key={d.date} className="legend-item">
              <span style={{ color: d.color, fontSize: "0.9rem" }}>●</span>
              <span>{d.label}</span>
              <span style={{ color: "#71717a", fontSize: "0.66rem", marginLeft: "auto" }}>
                {formatDateRu(d.date)}
              </span>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}
