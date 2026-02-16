@echo off
echo Starting Backup Server...
set NODE_ENV=production
cd /d "%~dp0"
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
if not exist client\dist (
    echo Building frontend...
    call npm run build
)
echo Server running at http://localhost:3101
call npm start
pause
