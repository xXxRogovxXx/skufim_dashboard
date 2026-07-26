# -*- coding: utf-8 -*-
"""Сборка JSON для React-фронтенда.

Экспортирует атомарные записи (records) + мету. Вся агрегация под фильтры,
кривые жизни, воронки и сравнение выполняется на клиенте — из тех же строк,
что использует Streamlit, поэтому числа совпадают.
"""
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd

from .loader import build_merged
from .metrics import IMPORTANT_DATES

DEFAULT_OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "web", "public", "data",
)


def _iso(d):
    if pd.isna(d):
        return None
    return pd.to_datetime(d).strftime("%Y-%m-%d")


def _num(x):
    """None для NaN, иначе округлённый float / int."""
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating, float)):
        f = float(x)
        return round(f, 4)
    return x


def build_records(df_merged):
    """Атомарные строки — то, из чего клиент агрегирует все графики."""
    cols = {
        "episode": "Выпуск",
        "short": "Короткое название",
        "starts": "Старты",
        "streams": "Стримы",
        "avg": "Средний_прослушивания",
        "completion": "Дослушиваемость",
        "listeners": "Слушатели",
        "hours": "Часы",
        "rsi": "RSI",
        "format": "Формат",
        "genre": "Жанр",
    }
    records = []
    for _, row in df_merged.iterrows():
        rec = {"date": _iso(row["Дата прослушивания"])}
        for key, src in cols.items():
            val = row[src] if src in row else None
            if key in ("episode", "short", "format", "genre"):
                rec[key] = None if (val is None or (isinstance(val, float) and np.isnan(val))) else str(val)
            else:
                rec[key] = _num(val)
        records.append(rec)
    return records


def build_meta(df_merged, df_total, df_ref):
    # порядок выпусков и дедуп по короткому названию — как dashboard.py:1194
    release_by_ep = df_total.groupby("Выпуск")["Дата прослушивания"].min()

    episodes = []
    seen_short = set()
    for _, r in df_ref.iterrows():
        ep = r["Выпуск"]
        short = r.get("Короткое название", ep)
        if short in seen_short:
            continue
        seen_short.add(short)
        episodes.append({
            "episode": str(ep),
            "short": str(short),
            "format": None if pd.isna(r.get("Формат")) else str(r.get("Формат")),
            "genre": None if pd.isna(r.get("Жанр")) else str(r.get("Жанр")),
            "duration": None if pd.isna(r.get("Длительность")) else str(r.get("Длительность")),
            "category": None if pd.isna(r.get("Категория")) else str(r.get("Категория")),
            "release_date": _iso(release_by_ep.get(ep)),
            "ref_release_date": _iso(r.get("Дата релиза")),
        })

    formats = [str(x) for x in df_ref["Формат"].dropna().unique()]
    genres = [str(x) for x in df_ref["Жанр"].dropna().unique()]

    important_dates = [
        {"date": k, "label": v["label"], "color": v["color"], "dash": v["dash"]}
        for k, v in IMPORTANT_DATES.items()
    ]

    return {
        "episodes": episodes,
        "formats": formats,
        "genres": genres,
        "date_min": _iso(df_total["Дата прослушивания"].min()),
        "date_max": _iso(df_total["Дата прослушивания"].max()),
        "record_count": int(len(df_merged)),
        "episode_count": int(len(episodes)),
        "important_dates": important_dates,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "version": 1,
    }


def export_all(out_dir=DEFAULT_OUT):
    df_merged, df_total, df_ref, _ = build_merged()

    os.makedirs(out_dir, exist_ok=True)
    records = build_records(df_merged)
    meta = build_meta(df_merged, df_total, df_ref)

    with open(os.path.join(out_dir, "records.json"), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(out_dir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)

    return {
        "out_dir": out_dir,
        "records": len(records),
        "episodes": meta["episode_count"],
    }
