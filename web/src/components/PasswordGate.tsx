import { useState, type ReactNode } from "react";
import { ACCESS_PASSWORD_SHA256, ACCESS_STORAGE_KEY } from "../config/access";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Сборка для .exe отключает пароль (VITE_DISABLE_GATE=true): программа работает
// локально на машине пользователя, экран пароля там не нужен. Веб-версия
// (GitHub Pages) собирается без этого флага — пароль остаётся.
const GATE_DISABLED = import.meta.env.VITE_DISABLE_GATE === "true";

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(
    () =>
      GATE_DISABLED ||
      localStorage.getItem(ACCESS_STORAGE_KEY) === ACCESS_PASSWORD_SHA256
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (ok) return <>{children}</>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const hash = await sha256(value);
    setBusy(false);
    if (hash === ACCESS_PASSWORD_SHA256) {
      localStorage.setItem(ACCESS_STORAGE_KEY, hash);
      setOk(true);
    } else {
      setError(true);
      setValue("");
    }
  };

  return (
    <div className="gate">
      <form className="gate-card glass" onSubmit={submit}>
        <div className="gate-logo">🎙️</div>
        <div className="gate-title">Подкаст · Аналитика</div>
        <div className="gate-sub">Введите пароль для доступа</div>
        <input
          type="password"
          className={`gate-input ${error ? "gate-input--error" : ""}`}
          placeholder="Пароль"
          value={value}
          autoFocus
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
        />
        {error && <div className="gate-error">Неверный пароль</div>}
        <button type="submit" className="gate-btn" disabled={busy || !value}>
          {busy ? "Проверка…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
