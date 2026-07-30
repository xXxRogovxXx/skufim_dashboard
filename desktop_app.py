# -*- coding: utf-8 -*-
"""Локальный лончер дашборда для упаковки в .exe (PyInstaller).

Что делает при запуске:
  1. Берёт Excel-файлы из папки рядом с .exe (Общая/Спр/Короткие названия +
     опционально Старты/Стримы).
  2. Пересчитывает данные в JSON.
  3. Поднимает локальный веб-сервер с собранным React-дашбордом.
  4. Открывает дашборд в браузере по умолчанию.

Сборка exe: см. build_exe.py
"""
import os
import sys
import shutil
import socket
import tempfile
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# UTF-8 в консоли Windows, чтобы кириллица не падала
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def base_dir():
    """Папка с Excel-файлами — рядом с .exe (или со скриптом в dev-режиме)."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def resource_dir():
    """Где лежит собранный фронтенд (внутри .exe — временная папка _MEIPASS)."""
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def dist_source():
    """Путь к собранному web/dist (в exe — 'web_dist', в dev — 'web/dist')."""
    frozen = os.path.join(resource_dir(), "web_dist")
    if os.path.exists(frozen):
        return frozen
    return os.path.join(resource_dir(), "web", "dist")


def find_free_port(start=8765, attempts=40):
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start


def pause_and_exit(code=1):
    try:
        input("\nНажмите Enter, чтобы закрыть…")
    except Exception:
        pass
    sys.exit(code)


def main():
    print("=" * 56)
    print("  Подкаст · Аналитика — локальный дашборд")
    print("=" * 56)

    data_folder = base_dir()
    os.environ["PODCAST_DATA_DIR"] = data_folder
    print(f"Папка с данными: {data_folder}")

    dist = dist_source()
    if not os.path.exists(dist):
        print("[ОШИБКА] Не найден собранный фронтенд (web/dist).")
        pause_and_exit()

    # Рабочая папка: копия фронтенда + свежие данные
    work = os.path.join(tempfile.gettempdir(), "podcast_dashboard_run")
    shutil.rmtree(work, ignore_errors=True)
    shutil.copytree(dist, work)

    # Генерация JSON из Excel
    print("Чтение Excel и подготовка данных…")
    try:
        from podcast_analytics.export import export_all
        result = export_all(out_dir=os.path.join(work, "data"))
        print(f"  Записей: {result['records']} | Выпусков: {result['episodes']}"
              f" | Демография: {'да' if result.get('demographics') else 'нет'}")
    except FileNotFoundError as e:
        print(f"[ОШИБКА] Не найден Excel-файл: {e}")
        print("Положите рядом с программой: Общая.xlsx, Спр.xlsx, "
              "Короткие названия.xlsx (и Старты.xlsx / Стримы.xlsx для демографии).")
        pause_and_exit()
    except Exception as e:
        print(f"[ОШИБКА] Не удалось обработать данные: {e}")
        pause_and_exit()

    # Локальный сервер
    port = find_free_port()
    handler = partial(SimpleHTTPRequestHandler, directory=work)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    url = f"http://127.0.0.1:{port}/"

    print("-" * 56)
    print(f"Дашборд открыт: {url}")
    print("Пароль по умолчанию: skufim2026")
    print("Чтобы закрыть — закройте это окно.")
    print("-" * 56)

    threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
