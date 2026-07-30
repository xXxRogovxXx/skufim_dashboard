# -*- coding: utf-8 -*-
"""Где лежат исходные Excel-файлы.

По умолчанию — корень проекта. В упакованном .exe лончер выставляет переменную
окружения PODCAST_DATA_DIR на папку рядом с исполняемым файлом.
"""
import os


def data_dir():
    env = os.environ.get("PODCAST_DATA_DIR")
    if env:
        return env
    # podcast_analytics/paths.py → корень проекта
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
