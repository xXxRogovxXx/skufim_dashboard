# -*- coding: utf-8 -*-
"""Метрики и константы. Портировано 1:1 из dashboard.py ради паритета чисел."""
import numpy as np

# Важные даты — те же, что в dashboard.py:556
IMPORTANT_DATES = {
    "2025-05-19": {"label": "🎤 Фичеринг 1", "color": "#7C3AED", "dash": "dash"},
    "2025-09-15": {"label": "🎤 Фичеринг 2", "color": "#7C3AED", "dash": "dot"},
}


def calculate_rsi(df):
    """RSI = Стримы · (конверсия + 1) · Старты^0.1  (dashboard.py:1094)."""
    df = df.copy()
    df["Конверсия_доля"] = df["Стримы"] / df["Старты"]
    df["Конверсия_доля"] = df["Конверсия_доля"].fillna(0).replace([np.inf, -np.inf], 0)
    df["RSI"] = df["Стримы"] * (df["Конверсия_доля"] + 1) * (df["Старты"] ** 0.1)
    return df
