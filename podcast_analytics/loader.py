# -*- coding: utf-8 -*-
"""Загрузка Excel и сборка merged-датафрейма. Портировано из dashboard.py:1069."""
import os
import pandas as pd

from .metrics import calculate_rsi

SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _path(name):
    return os.path.join(SCRIPT_DIR, name)


def load_data():
    """Возвращает (df_total, df_ref, short_names_dict) без Streamlit-зависимостей."""
    df_total = pd.read_excel(_path("Общая.xlsx"), sheet_name="Общая")
    df_ref = pd.read_excel(_path("Спр.xlsx"), sheet_name="Спр")
    try:
        df_short = pd.read_excel(_path("Короткие названия.xlsx"))
        short_names_dict = dict(
            zip(df_short["Оригинальное название"], df_short["Короткое название"])
        )
    except Exception:
        short_names_dict = {}

    df_total["Дата прослушивания"] = pd.to_datetime(df_total["Дата прослушивания"])
    df_ref["Дата релиза"] = pd.to_datetime(df_ref["Дата релиза"])
    df_ref["Короткое название"] = (
        df_ref["Выпуск"].map(short_names_dict).fillna(df_ref["Выпуск"])
    )

    df_total["Средний_прослушивания"] = df_total.get("Средний % прослушивания", 0).fillna(0)
    df_total["Дослушиваемость"] = df_total.get("% дослушиваемости", 0).fillna(0)
    df_total["Слушатели"] = df_total.get("Слушатели", 0).fillna(0)
    df_total["Часы"] = df_total.get("Часы", 0).fillna(0)

    return df_total, df_ref, short_names_dict


def build_merged():
    """df_merged с RSI — как в dashboard.py:1184."""
    df_total, df_ref, short_names_dict = load_data()

    df_merged = df_total.merge(df_ref, on="Выпуск", how="left")
    for col in ["Средний_прослушивания", "Дослушиваемость", "Слушатели", "Часы"]:
        df_merged[col] = df_merged[col].fillna(0)
    df_merged = calculate_rsi(df_merged)

    return df_merged, df_total, df_ref, short_names_dict
