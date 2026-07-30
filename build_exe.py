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

import PyInstaller.__main__

ROOT = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(ROOT, "web", "dist")

if not os.path.exists(os.path.join(DIST, "index.html")):
    print("[ОШИБКА] Нет web/dist. Сначала: cd web && npm run build")
    sys.exit(1)

PyInstaller.__main__.run([
    "desktop_app.py",
    "--name", "PodcastDashboard",
    "--onefile",
    "--console",
    # фронтенд внутрь exe как 'web_dist'
    "--add-data", f"{DIST}{os.pathsep}web_dist",
    # надёжно тянем пакеты
    "--collect-submodules", "podcast_analytics",
    "--collect-all", "openpyxl",
    "--hidden-import", "pandas",
    "--noconfirm",
    "--clean",
])
