# -*- coding: utf-8 -*-
"""Аналитические срезы для страницы «Инсайты».

Считаются из Общая.xlsx (там одновременно и демография, и проценты дослушивания)
+ Спр.xlsx (жанры). Части, которые удобнее считать на клиенте (динамика по
жанрам, кривая жизни, концентрация, прогноз, momentum) — здесь НЕ делаем.
"""
import pandas as pd

from .loader import _path, apply_aliases

GENDER_ORDER = ["Мужчины", "Женщины", "Не определен"]
AGE_ORDER = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-99", "Не определен"]


def _read():
    df = apply_aliases(pd.read_excel(_path("Общая.xlsx"), sheet_name="Общая"))
    ref = apply_aliases(pd.read_excel(_path("Спр.xlsx"), sheet_name="Спр"))
    for c in ["Старты", "Стримы", "% дослушиваемости", "Средний % прослушивания"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df, ref


def _pct(series):
    """К шкале 0..100 (если пришло 0..1 — умножаем)."""
    s = pd.to_numeric(series, errors="coerce")
    if s.notna().any() and s.max() <= 1.5:
        s = s * 100
    return s


def _seg_completion(df, gcol):
    """Взвешенные по стримам дослушиваемость и средний % по сегменту gcol."""
    comp = _pct(df["% дослушиваемости"])
    avg = _pct(df["Средний % прослушивания"])
    w = df["Стримы"].fillna(0)
    rows = []
    order = GENDER_ORDER if gcol == "Пол" else AGE_ORDER
    for name in [n for n in order if n in df[gcol].unique()]:
        m = df[gcol] == name
        cw = w[m & comp.notna()].sum()
        aw = w[m & avg.notna()].sum()
        rows.append({
            "name": str(name),
            "starts": int(df.loc[m, "Старты"].sum()),
            "streams": int(df.loc[m, "Стримы"].sum()),
            "completion": round(float((comp[m] * w[m]).sum() / cw), 1) if cw else None,
            "avg": round(float((avg[m] * w[m]).sum() / aw), 1) if aw else None,
        })
    return rows


def build_insights():
    df, ref = _read()

    # #5 — кросс пол × возраст (по стартам и стримам)
    ga = df.groupby(["Пол", "Возраст"])[["Старты", "Стримы"]].sum().reset_index()
    gender_age = [{
        "gender": str(r["Пол"]), "age": str(r["Возраст"]),
        "starts": int(r["Старты"]), "streams": int(r["Стримы"]),
    } for _, r in ga.iterrows()]

    # #4 — дослушиваемость / средний % по полу и возрасту
    completion_by_gender = _seg_completion(df, "Пол")
    completion_by_age = _seg_completion(df, "Возраст")

    # #1 — жанр × демография (по стартам)
    genre_demo = {}
    if "Жанр" in ref.columns:
        m = df.merge(ref[["Выпуск", "Жанр"]], on="Выпуск", how="left")
        for genre, sub in m.dropna(subset=["Жанр"]).groupby("Жанр"):
            def dist(col, order):
                g = sub.groupby(col)["Старты"].sum()
                return [{"name": str(n), "starts": int(g.get(n, 0))}
                        for n in order if n in g.index]
            genre_demo[str(genre)] = {
                "starts": int(sub["Старты"].sum()),
                "gender": dist("Пол", GENDER_ORDER),
                "age": dist("Возраст", AGE_ORDER),
            }

    return {
        "gender_order": GENDER_ORDER,
        "age_order": AGE_ORDER,
        "genderAge": gender_age,
        "completionByGender": completion_by_gender,
        "completionByAge": completion_by_age,
        "genreDemographics": genre_demo,
    }
