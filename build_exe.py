# -*- coding: utf-8 -*-
"""Сборка .exe из desktop_app.py через PyInstaller.

Требования:
  - собранный фронтенд в web/dist  (cd web && npm run build)
  - установленный PyInstaller       (pip install pyinstaller)

Запуск:  python build_exe.py
Результат: dist/PodcastDashboard.exe
"""
import os
import sys
import shutil
import tempfile

import PyInstaller.__main__

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "web", "dist")

if not os.path.exists(os.path.join(DIST, "index.html")):
    print("[ОШИБКА] Нет web/dist. Сначала: cd web && npm run build")
    sys.exit(1)

# Готовим ЧИСТУЮ копию фронтенда БЕЗ папки data/ — чтобы в exe не попали
# данные разработчика. Данные генерируются при запуске из Excel пользователя.
STAGE = os.path.join(tempfile.gettempdir(), "podcast_dashboard_stage")
shutil.rmtree(STAGE, ignore_errors=True)
shutil.copytree(DIST, STAGE)
shutil.rmtree(os.path.join(STAGE, "data"), ignore_errors=True)
print(f"Упаковываю фронтенд без data/: {STAGE}")

PyInstaller.__main__.run([
    "desktop_app.py",
    "--name", "PodcastDashboard",
    "--onefile",
    "--console",
    # фронтенд внутрь exe как 'web_dist' (без данных разработчика)
    "--add-data", f"{STAGE}{os.pathsep}web_dist",
    # надёжно тянем пакеты
    "--collect-submodules", "podcast_analytics",
    "--collect-all", "openpyxl",
    "--hidden-import", "pandas",
    "--noconfirm",
    "--clean",
])
