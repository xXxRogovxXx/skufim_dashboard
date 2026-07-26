import os
import sys
import subprocess
import pandas as pd
import socket


def find_free_port(start_port=8501, max_attempts=10):
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('localhost', port))
                return port
            except OSError:
                continue
    return 8501


def check_and_create_reference_files():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_file = os.path.join(script_dir, "Общая.xlsx")
    ref_file = os.path.join(script_dir, "Спр.xlsx")
    short_file = os.path.join(script_dir, "Короткие названия.xlsx")

    if os.path.exists(ref_file) and os.path.exists(short_file):
        print("✅ Справочные файлы уже существуют")
        return True

    print("⚠️ Создание справочных файлов...\n")
    if not os.path.exists(source_file):
        print(f"❌ Файл не найден: {source_file}")
        return False

    try:
        df = pd.read_excel(source_file, sheet_name="Общая")
        print(f"✓ Загружено: {len(df)} строк, {df['Атрибут'].nunique()} выпусков\n")

        ref_df = df.groupby("Атрибут").agg(Дата_релиза=("Дата прослушивания", "min")).reset_index()
        ref_df.columns = ["Выпуск", "Дата релиза"]
        for col in ["Формат", "Жанр", "Длительность", "Категория"]:
            ref_df[col] = ""
        ref_df = ref_df[["Выпуск", "Формат", "Жанр", "Длительность", "Категория", "Дата релиза"]]
        ref_df.to_excel(ref_file, sheet_name="Спр", index=False)
        print(f"✓ Спр.xlsx — {len(ref_df)} выпусков")

        short_df = pd.DataFrame({
            "Оригинальное название": df["Атрибут"].unique(),
            "Короткое название": ""
        })
        short_df.to_excel(short_file, index=False)
        print(f"✓ Короткие названия.xlsx — {len(short_df)} названий")
        print("\n✅ Файлы созданы! Заполните пустые поля и запустите снова.\n")
        return True
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def fix_dashboard_for_old_streamlit(content):
    """Исправляет код дашборда для streamlit 1.12.0"""

    # 1. Декораторы
    content = content.replace(
        '@st.cache_data',
        '@st.cache(allow_output_mutation=True, suppress_st_warning=True)'
    )
    content = content.replace(
        '@st.cache_resource',
        '@st.cache(allow_output_mutation=True, suppress_st_warning=True)'
    )

    # 2. Убираем use_container_width
    content = content.replace('use_container_width=True', '')
    content = content.replace(', )', ')')
    content = content.replace('(, ', '(')

    # 3. Полная замена функции load_data на безопасную версию
    import re

    # Находим функцию load_data
    pattern = r'def load_data\(\):.*?(?=\n\ndef |\nclass |\nif __name__|$)'

    safe_load_data = '''def load_data():
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        source_file = os.path.join(script_dir, "Общая.xlsx")
        ref_file = os.path.join(script_dir, "Спр.xlsx")
        short_file = os.path.join(script_dir, "Короткие названия.xlsx")

        if not os.path.exists(source_file):
            print("Ошибка: Файл Общая.xlsx не найден")
            return None, None, {}

        df_total = pd.read_excel(source_file, sheet_name="Общая")
        df_ref = pd.read_excel(ref_file, sheet_name="Спр")
        short_df = pd.read_excel(short_file)
        short_names_dict = dict(zip(short_df["Оригинальное название"], short_df["Короткое название"]))

        return df_total, df_ref, short_names_dict
    except Exception as e:
        print("Ошибка загрузки данных: " + str(e))
        return None, None, {}'''

    content = re.sub(pattern, safe_load_data, content, flags=re.DOTALL)

    # 4. Убираем weight из plotly
    content = content.replace(", weight='bold'", "")
    content = content.replace(', weight="bold"', "")

    # 5. Чистим двойные запятые и другие артефакты
    while ', ,' in content:
        content = content.replace(', ,', ',')
    while '(, ' in content:
        content = content.replace('(, ', '(')
    while ', )' in content:
        content = content.replace(', )', ')')

    return content


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_file = os.path.join(script_dir, "Общая.xlsx")
    ref_file = os.path.join(script_dir, "Спр.xlsx")
    short_file = os.path.join(script_dir, "Короткие названия.xlsx")
    dashboard_file = os.path.join(script_dir, "dashboard.py")

    all_ready = all(os.path.exists(f) for f in [source_file, ref_file, short_file])

    if all_ready:
        if not os.path.exists(dashboard_file):
            print(f"❌ dashboard.py не найден в {script_dir}")
            sys.exit(1)

        with open(dashboard_file, 'r', encoding='utf-8') as f:
            content = f.read()

        content = fix_dashboard_for_old_streamlit(content)

        fixed_file = os.path.join(script_dir, "_dashboard_fixed.py")
        with open(fixed_file, 'w', encoding='utf-8') as f:
            f.write(content)

        port = find_free_port(8501)
        print("=" * 50)
        print("🚀 ЗАПУСК STREAMLIT ДАШБОРДА")
        print("=" * 50)
        print(f"\n📱 Откройте в браузере: http://localhost:{port}")
        print("⏹  Для остановки нажмите Ctrl+C\n")

        subprocess.run([sys.executable, "-m", "streamlit", "run", fixed_file, "--server.port", str(port)])
    else:
        check_and_create_reference_files()
        print("⏸️  Заполните справочники и запустите снова: python auto_dashboard.py")