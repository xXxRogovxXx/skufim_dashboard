import { useEffect, useState } from "react";
import AuroraBackground from "./components/AuroraBackground";
import PasswordGate from "./components/PasswordGate";
import Sidebar, { type PageId } from "./components/Sidebar";
import Overview from "./pages/Overview";
import Episode from "./pages/Episode";
import Compare from "./pages/Compare";
import { loadDataset, type Dataset } from "./lib/data";

export default function App() {
  const [page, setPage] = useState<PageId>("overview");
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataset().then(setData).catch((e) => setError(String(e)));
  }, []);

  return (
    <PasswordGate>
      <AuroraBackground />
      {error ? (
        <div className="error-box">
          Не удалось загрузить данные: {error}
          <br />
          Запустите экспорт: <code>python export_data.py</code>
        </div>
      ) : !data ? (
        <div className="loading">🔄 Загрузка данных…</div>
      ) : (
        <div className="app">
          <Sidebar page={page} onChange={setPage} importantDates={data.meta.important_dates} />
          <main className="main">
            {page === "overview" && <Overview data={data} />}
            {page === "episode" && <Episode data={data} />}
            {page === "compare" && <Compare data={data} />}
          </main>
        </div>
      )}
    </PasswordGate>
  );
}
