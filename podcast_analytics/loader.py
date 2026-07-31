# -*- coding: utf-8 -*-
"""Загрузка Excel и сборка merged-датафрейма. Портировано из dashboard.py:1069."""
import os
import pandas as pd

from .metrics import calculate_rsi
from .paths import data_dir


def _path(name):
    return os.path.join(data_dir(), name)


# Колонки-признаки того, что в Общая.xlsx лежит демографическая разбивка
DEMO_COLS = {"Пол", "Возраст", "Город"}
# Аддитивные метрики (свои для каждого сегмента) — суммируем
SUM_COLS = ["Старты", "Стримы"]
# Метрики-тоталы, повторённые на каждой демо-строке (Слушатели/Часы), и проценты
# — усредняем по «день-выпуск» (иначе Слушатели/Часы раздуваются в N раз)
MEAN_COLS = ["Слушатели", "Часы", "% дослушиваемости", "Средний % прослушивания"]


def _pct_to_fraction(series):
    """Приводит проценты к доле 0..1. Если шкала 0..100 — делит на 100."""
    s = pd.to_numeric(series, errors="coerce")
    if s.notna().any() and s.max() > 1.5:
        s = s / 100.0
    return s


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

    # Формат «демография внутри Общая.xlsx»: одна строка = сегмент (город×возраст×пол),
    # проценты заполнены лишь в части строк. Схлопываем к уровню дата×выпуск:
    # счётчики суммируем, проценты усредняем по НЕпустым (иначе среднее занижается).
    if DEMO_COLS & set(df_total.columns):
        agg = {}
        for c in SUM_COLS:
            if c in df_total.columns:
                agg[c] = "sum"
        for c in MEAN_COLS:
            if c in df_total.columns:
                agg[c] = "mean"  # pandas mean игнорирует NaN
        df_total = (
            df_total.groupby(["Дата прослушивания", "Выпуск"], as_index=False).agg(agg)
        )

    # Проценты → доля 0..1 (автоопределение шкалы 0..100 vs 0..1)
    df_total["Средний_прослушивания"] = _pct_to_fraction(
        df_total.get("Средний % прослушивания", 0)
    ).fillna(0)
    df_total["Дослушиваемость"] = _pct_to_fraction(
        df_total.get("% дослушиваемости", 0)
    ).fillna(0)
    df_total["Слушатели"] = pd.to_numeric(
        df_total.get("Слушатели", 0), errors="coerce"
    ).fillna(0)
    df_total["Часы"] = pd.to_numeric(df_total.get("Часы", 0), errors="coerce").fillna(0)

    return df_total, df_ref, short_names_dict


def build_merged():
    """df_merged с RSI — как в dashboard.py:1184."""
    df_total, df_ref, short_names_dict = load_data()

    df_merged = df_total.merge(df_ref, on="Выпуск", how="left")
    for col in ["Средний_прослушивания", "Дослушиваемость", "Слушатели", "Часы"]:
        df_merged[col] = df_merged[col].fillna(0)
    df_merged = calculate_rsi(df_merged)

    return df_merged, df_total, df_ref, short_names_dict
