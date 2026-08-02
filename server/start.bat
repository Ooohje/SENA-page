@echo off
title SENA Backend
cd /d "%~dp0"
chcp 65001 >nul

echo.
echo ========================================
echo   SENA Backend
echo ========================================
echo.

python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found in PATH.
    pause
    exit /b 1
)
echo [OK] Python found

taskkill /F /IM cloudflared.exe >nul 2>&1

curl -s --max-time 2 http://localhost:11434 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    where ollama >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Ollama not installed. https://ollama.com/download
        pause
        exit /b 1
    )
    echo [INFO] Starting Ollama...
    start "" ollama serve
    timeout /t 4 /nobreak >nul
) else (
    echo [OK] Ollama running
)

ollama list 2>nul | findstr "qwen3" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Pulling qwen3:8b...
    ollama pull qwen3:8b
)
echo [OK] qwen3:8b ready

echo.

echo [1/2] FastAPI server starting in a new window...

set PATH=C:\Users\ohje\AppData\Local\Programs\Python\Python311\Lib\site-packages\nvidia\cublas\bin;%PATH%

start "SENA - FastAPI Server" python main.py

echo [2/2] Cloudflare Tunnel starting...
echo.
echo ===================================================
echo   Copy the HTTPS address below into your browser
echo   (wait a moment for it to appear)
echo ===================================================
echo.

cloudflared tunnel --url http://127.0.0.1:8000 --no-autoupdate --protocol http2

echo.
echo [INFO] Tunnel stopped. Close the FastAPI window too.
pause
