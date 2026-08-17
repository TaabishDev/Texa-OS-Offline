#!/bin/bash
# ====================================================================
# TEXA OS Setup and Installation Script (macOS / Linux)
# ====================================================================

echo "===================================================="
echo "      Initializing TEXA AI Assistant Setup          "
echo "===================================================="

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "[-] Error: python3 is not installed. Please install Python 3.10+ first."
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[-] Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "[+] Setting up Python Virtual Environment..."
cd backend
python3 -m venv .venv
source .venv/bin/activate

echo "[+] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "[+] Installing Playwright browsers..."
playwright install chromium

cd ..

echo "[+] Installing Node dependencies for frontend..."
npm install

echo "===================================================="
echo "[+] TEXA OS Installation Complete!"
echo "===================================================="
echo "To launch the system:"
echo "1. Start Python Automation Backend: "
echo "   cd backend && source .venv/bin/activate && python main.py"
echo "2. In a separate terminal, launch React UI:"
echo "   npm run dev"
echo "3. Visit http://localhost:3000 to meet Texa, boss!"
echo "===================================================="
