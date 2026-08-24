import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "dark"
  );

  // Применяем тему СИНХРОННО в фазе рендера (до детей), чтобы графики,
  // читающие CSS-переменные через getComputedStyle, видели актуальные цвета.
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (root.getAttribute("data-theme") !== theme) {
      root.classList.add("theme-switching"); // гасим переходы на момент смены
      root.setAttribute("data-theme", theme);
    }
  }

  useEffect(() => {
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    const raf = requestAnimationFrame(() => root.classList.remove("theme-switching"));
    return () => cancelAnimationFrame(raf);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? "Светлая тема (необрутализм)" : "Тёмная тема"}
      aria-label="Переключить тему"
    >
      {theme === "dark" ? "☀︎" : "☾"}
      <span className="theme-toggle__label">{theme === "dark" ? "Светлая" : "Тёмная"}</span>
    </button>
  );
}
