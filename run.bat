@echo off
title SmartCity AI
color 0B

echo.
echo ============================================
echo   SmartCity AI - Akilli Sehir Yonetimi
echo   AI-Destekli Lojistik ve Acil Durum Sistemi
echo   Algoritmalar: Dijkstra, A*, MinHeap, Greedy
echo ============================================
echo.

:: Check for Python
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo  Python bulundu
    goto :start_python
)

where python3 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo  Python3 bulundu
    goto :start_python3
)

:: Check for Node.js npx
where npx >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo  Node.js bulundu, npx ile baslatiliyor...
    goto :start_npx
)

echo  Python veya Node.js bulunamadi!
echo.
echo  Lutfen asagidakilerden birini yukleyin:
echo    - Python: https://www.python.org/downloads/
echo    - Node.js: https://nodejs.org/
echo.
pause
exit /b 1

:start_python
echo  Sunucu baslatiliyor: http://localhost:8080
echo  Durdurmak icin Ctrl+C basin
echo.
start "" "http://localhost:8080"
python -m http.server 8080 --bind 127.0.0.1
goto :end

:start_python3
echo  Sunucu baslatiliyor: http://localhost:8080
echo  Durdurmak icin Ctrl+C basin
echo.
start "" "http://localhost:8080"
python3 -m http.server 8080 --bind 127.0.0.1
goto :end

:start_npx
echo  Sunucu baslatiliyor: http://localhost:8080
echo  Durdurmak icin Ctrl+C basin
echo.
start "" "http://localhost:8080"
npx -y http-server -p 8080 -c-1
goto :end

:end
echo.
echo  Sunucu durduruldu.
pause
