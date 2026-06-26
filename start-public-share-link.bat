@echo off
cd /d "%~dp0"
if not exist output mkdir output
start "Tainan Land Value Helper" cmd /k node tainan-land-value-server.js
echo.
echo 正在建立公開分享網址，請稍候...
tools\cloudflared.exe tunnel --url http://127.0.0.1:8787 --no-autoupdate
