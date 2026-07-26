// Форматтеры — порт из dashboard.py:576.

export function safeDiv(a: number, b: number, def = 0): number {
  return b !== 0 && Number.isFinite(a / b) ? a / b : def;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("ru-RU");
}

export function formatPercent(n: number, places = 1): string {
  return `${n.toFixed(places)}%`;
}

export function formatDecimal(n: number, places = 1): string {
  return n.toFixed(places);
}

export function formatDateRu(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
