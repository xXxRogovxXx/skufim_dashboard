// Дизайн-токены. Семантика цветов метрик сохранена из dashboard.py.

export const COLORS = {
  starts: "#8B5CF6", // старты — фиолетовый (светящийся)
  streams: "#FB7185", // стримы — розово-красный (мягче чистого красного)
  conversion: "#34D399", // конверсия — изумрудный
  listeners: "#FBBF24", // слушатели — тёплый янтарный
  hours: "#38BDF8", // часы — небесно-голубой (в тон aurora)
  rsi: "#C4B5FD", // RSI — светло-фиолетовый
  completion: "#34D399",
  accent: "#7C3AED",
  accentSoft: "#A78BFA",
  danger: "#FB7185",
  success: "#34D399",
  warning: "#FBBF24",
  info: "#38BDF8",
  text: "#FAFAFA",
  textMuted: "#A1A1AA",
  textFaint: "#71717A",
  grid: "rgba(255,255,255,0.05)",
};

// Палитра для категориальных серий (жанры, дни недели) — гармоничный «aurora»-набор
export const SERIES_PALETTE = [
  "#8B5CF6", // violet
  "#38BDF8", // sky
  "#34D399", // emerald
  "#FBBF24", // amber
  "#FB7185", // rose
  "#A78BFA", // soft violet
  "#22D3EE", // cyan
  "#F472B6", // pink
];

export const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
// getDay(): 0=вс..6=сб → индекс в weekday_order (Пн..Вс)
export const JS_DAY_TO_MON_INDEX = [6, 0, 1, 2, 3, 4, 5];
