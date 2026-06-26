@echo off
cd /d "%~dp0"
start "" "http://127.0.0.1:8787/tainan-land-value-helper.html"
node tainan-land-value-server.js
