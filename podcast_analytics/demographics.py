# -*- coding: utf-8 -*-
"""Демография: пол / возраст / город по стартам и стримам.

Поддерживаются два формата исходных данных (алгоритм определяет сам):

1) Отдельные файлы «Старты.xlsx» и «Стримы.xlsx» (лист 'Chart data') с
   колонками Дата/Эпизод_2/Пол/Возраст/Город + метрика.
2) Единый «Общая.xlsx» (лист 'Общая'), где демография лежит прямо в строках:
   колонки Пол/Возраст/Город рядом со Старты/Стримы/Выпуск.

В обоих случаях приводим к df: episode, gender, age, city, starts, streams —
и агрегируем в компактные распределения (overall + по выпускам).
"""
import os

import pandas as pd

from .geo import normalize_city, city_coords
from .paths import data_dir

SHEET = "Chart data"
STARTS_FILE = "Старты.xlsx"
STREAMS_FILE = "Стримы.xlsx"
GENERAL_FILE = "Общая.xlsx"
GENERAL_SHEET = "Общая"

# Порядок категорий для стабильного вывода
GENDER_ORDER = ["Женщины", "Мужчины", "Не определен"]
AGE_ORDER = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-99", "Не определен"]

# Сколько городов отдавать в JSON
CITY_TOP_OVERALL = 120
CITY_TOP_EPISODE = 40


def _path(name):
    return os.path.join(data_dir(), name)


def _load_demographics_df():
    """Единый df (episode, gender, age, city, starts, streams) из любого формата."""
    if os.path.exists(_path(STARTS_FILE)) and os.path.exists(_path(STREAMS_FILE)):
        return _load_pair()
    if os.path.exists(_path(GENERAL_FILE)):
        df = _load_from_general()
        if df is not None:
            return df
    raise FileNotFoundError(
        "нет демографии: ни Старты.xlsx/Стримы.xlsx, ни колонок Пол/Возраст/Город в Общая.xlsx"
    )


def _load_pair():
    """Формат 1: отдельные Старты.xlsx + Стримы.xlsx (лист 'Chart data')."""
    ds = pd.read_excel(_path(STARTS_FILE), sheet_name=SHEET)
    dm = pd.read_excel(_path(STREAMS_FILE), sheet_name=SHEET)
    dims = ["Дата прослушивания", "Эпизод_2", "Пол", "Возраст", "Город"]
    ds = ds.rename(columns={"Старты": "starts"})[dims + ["starts"]]
    dm = dm.rename(columns={"Стримы": "streams"})[dims + ["streams"]]
    df = ds.merge(dm, on=dims, how="outer")
    df["starts"] = df["starts"].fillna(0)
    df["streams"] = df["streams"].fillna(0)
    df = df.rename(columns={
        "Эпизод_2": "episode", "Пол": "gender", "Возраст": "age", "Город": "city",
    })
    return df


def _load_from_general():
    """Формат 2: демография внутри Общая.xlsx (колонки Пол/Возраст/Город).

    Возвращает df или None, если демо-колонок в файле нет.
    """
    df = pd.read_excel(_path(GENERAL_FILE), sheet_name=GENERAL_SHEET)
    needed = {"Пол", "Возраст", "Город", "Выпуск", "Старты", "Стримы"}
    if not needed.issubset(set(df.columns)):
        return None
    df = df.rename(columns={
        "Выпуск": "episode", "Пол": "gender", "Возраст": "age",
        "Город": "city", "Старты": "starts", "Стримы": "streams",
    })
    df = df[["episode", "gender", "age", "city", "starts", "streams"]].copy()
    df["starts"] = pd.to_numeric(df["starts"], errors="coerce").fillna(0)
    df["streams"] = pd.to_numeric(df["streams"], errors="coerce").fillna(0)
    return df


def _dim_list(g, order=None):
    """g — DataFrame после groupby(dim).sum() c колонками starts/streams."""
    rows = [
        {"name": str(idx), "starts": int(r["starts"]), "streams": int(r["streams"])}
        for idx, r in g.iterrows()
    ]
    if order:
        pos = {n: i for i, n in enumerate(order)}
        rows.sort(key=lambda x: pos.get(x["name"], len(order)))
    else:
        rows.sort(key=lambda x: x["starts"], reverse=True)
    return rows


def _city_block(sub, top):
    """Города с координатами (для карты) + покрытие."""
    sub = sub.copy()
    sub["city_norm"] = sub["city"].map(normalize_city)
    agg = sub.groupby("city_norm")[["starts", "streams"]].sum()

    total_starts = int(agg["starts"].sum())
    total_streams = int(agg["streams"].sum())

    points = []
    mapped_starts = mapped_streams = 0
    for name, r in agg.iterrows():
        coords = city_coords(name)
        if coords is None:
            continue
        s, m = int(r["starts"]), int(r["streams"])
        mapped_starts += s
        mapped_streams += m
        points.append({
            "name": name, "starts": s, "streams": m,
            "lon": coords[0], "lat": coords[1],
        })
    points.sort(key=lambda x: x["starts"], reverse=True)
    points = points[:top]
    return {
        "points": points,
        "total_starts": total_starts,
        "total_streams": total_streams,
        "mapped_starts": mapped_starts,
        "mapped_streams": mapped_streams,
    }


def _scope(df, city_top):
    return {
        "gender": _dim_list(df.groupby("gender")[["starts", "streams"]].sum(), GENDER_ORDER),
        "age": _dim_list(df.groupby("age")[["starts", "streams"]].sum(), AGE_ORDER),
        "city": _city_block(df, city_top),
    }


def build_demographics():
    df = _load_demographics_df()

    overall = _scope(df, CITY_TOP_OVERALL)

    by_episode = {}
    for ep, sub in df.groupby("episode"):
        by_episode[str(ep)] = _scope(sub, CITY_TOP_EPISODE)

    return {
        "meta": {
            "gender_order": GENDER_ORDER,
            "age_order": AGE_ORDER,
            "episode_count": int(df["episode"].nunique()),
        },
        "overall": overall,
        "byEpisode": by_episode,
    }
