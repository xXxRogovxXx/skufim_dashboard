# 🎙️ Подкаст · Аналитика

Интерактивный дашборд аналитики подкаста в стиле глассморфизм.
Данные считаются на Python из Excel и экспортируются в JSON, фронтенд — React
(Vite + TypeScript + Recharts). Сайт полностью статический.

## Структура

```
podcast_analytics/     # Python: загрузка Excel + расчёты (RSI, воронки, кривые жизни)
export_data.py         # генерирует web/public/data/*.json из Excel
web/                   # React-фронтенд (Vite + TS + Recharts)
  public/data/*.json   # данные для сайта (коммитятся; собираются из Excel)
  src/                 # компоненты, страницы, дизайн-система
dashboard.py           # прежний Streamlit-дашборд (для сверки чисел)
```

Сырые Excel-файлы (`*.xlsx`) в репозиторий **не** коммитятся — публикуется только
сгенерированный JSON.

## Локальная разработка

```bash
# 1. Пересчитать данные из Excel (после изменения .xlsx)
python export_data.py

# 2. Запустить фронтенд
cd web
npm install
npm run dev
```

## Обновление данных

1. Заменить Excel-файлы в корне проекта.
2. `python export_data.py` — обновит `web/public/data/*.json`.
3. Закоммитить изменённый JSON и запушить — сайт пересоберётся автоматически.

## Деплой (GitHub Pages)

Настроен автоматический деплой через GitHub Actions
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)):
при каждом `push` в ветку `main` сайт собирается и публикуется на GitHub Pages.

Разовая настройка после первого пуша: **Settings → Pages → Build and deployment →
Source: GitHub Actions**.

Адрес сайта: `https://<ваш-логин>.github.io/<имя-репозитория>/`
(базовый путь подставляется в сборку автоматически из имени репозитория).
