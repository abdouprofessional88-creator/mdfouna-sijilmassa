@echo off
REM One-click launcher for Mdfouna Sijilmassa website
REM Do NOT double-click index.html (it stays blank). Use this file instead.
cd /d "%~dp0"
echo ============================================
echo  Mdfouna Sijilmassa - starting website...
echo  Open: http://localhost:5173/
echo ============================================
start "" "http://localhost:5173/"
npm run dev
pause
