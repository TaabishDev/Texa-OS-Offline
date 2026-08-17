@echo off
rem ====================================================================
rem TEXA OS Setup and Installation Script (Windows)
rem ====================================================================

echo ====================================================
echo       Initializing TEXA AI Assistant Setup (Windows)   
echo ====================================================

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [-] Error: Python is not installed. Add it to your PATH and try again.
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [-] Error: Node.js is not installed. Please install it first.
    pause
    exit /b 1
)

echo [+] Setting up Python Virtual Environment...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat

echo [+] Installing Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo [+] Installing Playwright browsers...
playwright install chromium

cd ..

echo [+] Installing Node dependencies for frontend...
call npm install

echo ====================================================
echo [+] TEXA OS Installation Complete!
echo ====================================================
echo To launch the system:
echo 1. Start Python Automation Backend:
echo    cd backend ^&^& .venv\Scripts\activate.bat ^&^& python main.py
echo 2. In a separate terminal, launch React UI:
echo    npm run dev
echo 3. Visit http://localhost:3000 to meet Texa, boss!
echo ====================================================
pause
