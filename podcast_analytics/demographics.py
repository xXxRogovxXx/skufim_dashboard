# -*- coding: utf-8 -*-
"""Демография: пол / возраст / город по стартам и стримам.

Источники — «Старты.xlsx» и «Стримы.xlsx» (лист 'Chart data'), гранулярность
дата × выпуск × пол × возраст × город. Мержим оба файла по этим измерениям и
агрегируем в компактные распределения: overall и по каждому выпуску.
"""
import os

import pandas as pd

from .geo import normalize_city, city_coords
from .paths import data_dir

SHEET = "Chart data"
STARTS_FILE = "Старты.xlsx"
STREAMS_FILE = "Стримы.xlsx"

# Порядок категорий для стабильного вывода
GENDER_ORDER = ["Женщины", "Мужчины", "Не определен"]
AGE_ORDER = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-99", "Не определен"]

# Сколько городов отдавать в JSON
CITY_TOP_OVERALL = 120
CITY_TOP_EPISODE = 40


def _path(name):
    return os.path.join(data_dir(), name)


def _load_pair():
    """Возвращает df: date, episode, gender, age, city, starts, streams."""
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
    df = _load_pair()

    overall = _scope(df, CITY_TOP_OVERALL)

    by_episode = {}
    for ep, sub in df.groupby("episode"):
        by_episode[str(ep)] = _scope(sub, CITY_TOP_EPISODE)

    return {
        "meta": {
            "gender_order": GENDER_ORDER,
            "age_order": AGE_ORDER,
            "date_min": str(df["Дата прослушивания"].min())[:10],
            "date_max": str(df["Дата прослушивания"].max())[:10],
            "episode_count": int(df["episode"].nunique()),
        },
        "overall": overall,
        "byEpisode": by_episode,
    }
