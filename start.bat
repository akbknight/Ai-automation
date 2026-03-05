@echo off
echo Starting Super Sonic AI File Organizer...

echo Checking for Python virtual environment...
if not exist "backend\.venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found in backend\.venv
    echo Please ensure the installation completed successfully.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Starting FastAPI Backend (Port 8000)...
echo ==========================================
start cmd /k "cd backend && call .venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

echo.
echo ==========================================
echo Starting React Frontend (Port 5173)...
echo ==========================================
start cmd /k "cd frontend && npm run dev"

echo.
echo Both servers have been launched in separate windows!
echo Please open http://localhost:5173 in your browser to use the AI File Organizer.
echo Keep the application windows open while using the tool.
echo.
pause
