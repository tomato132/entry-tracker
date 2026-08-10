@echo off
cd /d "%~dp0"
echo Starting Entry Tracker ...
echo Open http://localhost:3000 in your browser.
echo Close this window to stop the server.
"C:\Users\Administrator\AppData\Local\Programs\Kimi\resources\resources\runtime\node.exe" node_modules\next\dist\bin\next dev
pause
