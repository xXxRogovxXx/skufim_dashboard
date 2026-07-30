@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Обновление дашборда

echo ======================================================
echo    Обновление данных и публикация на сайт
echo ======================================================
echo.
echo [1/4] Пересчёт данных из Excel...
".venv\Scripts\python.exe" export_data.py
if errorlevel 1 goto error_data

echo.
echo [2/4] Подготовка изменений...
git add web/public/data/
git diff --cached --quiet && goto nochanges

echo.
echo [3/4] Сохранение изменений...
git commit -m "Обновление данных %date% %time%"

echo.
echo [4/4] Публикация на GitHub...
git pull --rebase --autostash origin main
if errorlevel 1 goto error_sync
git push origin main
if errorlevel 1 goto error_push

echo.
echo ======================================================
echo    ГОТОВО! Сайт обновится за 1-2 минуты.
echo    Откройте сайт и нажмите Ctrl+Shift+R.
echo ======================================================
echo.
pause
exit /b 0

:nochanges
echo.
echo Данные не изменились - публиковать нечего.
echo.
pause
exit /b 0

:error_data
echo.
echo [ОШИБКА] Не удалось пересчитать данные.
echo Проверьте, что Excel-файлы на месте и НЕ открыты в Excel.
echo.
pause
exit /b 1

:error_sync
echo.
echo [ОШИБКА] Конфликт при синхронизации с GitHub.
echo Похоже, данные меняли ещё где-то. Напишите разработчику.
echo.
pause
exit /b 1

:error_push
echo.
echo [ОШИБКА] Не удалось отправить на GitHub.
echo Проверьте интернет и доступ к репозиторию.
echo.
pause
exit /b 1
