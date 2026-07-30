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
import subprocess
import tempfile

import PyInstaller.__main__

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")
DIST_EXE = os.path.join(WEB, "dist-exe")

# Собираем фронтенд специально для exe: БЕЗ экрана пароля (VITE_DISABLE_GATE)
# и в отдельную папку dist-exe, чтобы не путать с веб-сборкой.
npm = shutil.which("npm") or "npm"
env = {**os.environ, "VITE_DISABLE_GATE": "true"}
print("Собираю фронтенд для exe (без пароля)…")
try:
    subprocess.run(
        [npm, "run", "build", "--", "--outDir", "dist-exe", "--emptyOutDir"],
        cwd=WEB, env=env, shell=(os.name == "nt"), check=True,
    )
except (subprocess.CalledProcessError, FileNotFoundError) as e:
    print(f"[ОШИБКА] Сборка фронтенда не удалась: {e}")
    print("Проверьте, что установлен Node.js и выполнен 'npm install' в web/.")
    sys.exit(1)

if not os.path.exists(os.path.join(DIST_EXE, "index.html")):
    print("[ОШИБКА] Нет web/dist-exe после сборки.")
    sys.exit(1)

# ЧИСТАЯ копия БЕЗ папки data/ — чтобы в exe не попали данные разработчика.
STAGE = os.path.join(tempfile.gettempdir(), "podcast_dashboard_stage")
shutil.rmtree(STAGE, ignore_errors=True)
shutil.copytree(DIST_EXE, STAGE)
shutil.rmtree(os.path.join(STAGE, "data"), ignore_errors=True)
print(f"Упаковываю фронтенд без data/: {STAGE}")

ICON = os.path.join(ROOT, "app_icon.ico")
icon_args = ["--icon", ICON] if os.path.exists(ICON) else []

PyInstaller.__main__.run([
    "desktop_app.py",
    "--name", "PodcastDashboard",
    "--onefile",
    "--windowed",  # без консольного окна — тихий запуск, сразу браузер
    *icon_args,
    # фронтенд внутрь exe как 'web_dist' (без данных разработчика)
    "--add-data", f"{STAGE}{os.pathsep}web_dist",
    # надёжно тянем пакеты
    "--collect-submodules", "podcast_analytics",
    "--collect-all", "openpyxl",
    "--hidden-import", "pandas",
    "--noconfirm",
    "--clean",
])
