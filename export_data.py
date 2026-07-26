# -*- coding: utf-8 -*-
"""CLI: python export_data.py — читает Excel и пишет web/public/data/*.json."""
import sys

from podcast_analytics.export import export_all


def main():
    try:
        result = export_all()
    except Exception as e:
        print(f"[ERROR] Экспорт не удался: {e}")
        sys.exit(1)
    print("[OK] JSON экспортирован")
    print(f"  Каталог: {result['out_dir']}")
    print(f"  Записей: {result['records']}")
    print(f"  Выпусков: {result['episodes']}")


if __name__ == "__main__":
    main()
