# -*- coding: utf-8 -*-
"""Чистая логика данных дашборда подкаста (без Streamlit).

Переиспользует расчёты из dashboard.py, но без UI-зависимостей —
пригодно для экспорта в JSON под React-фронтенд.
"""
from .loader import load_data, build_merged
from .metrics import calculate_rsi, IMPORTANT_DATES

__all__ = ["load_data", "build_merged", "calculate_rsi", "IMPORTANT_DATES"]
