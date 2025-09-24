@echo off
echo 🚀 Setting up Deepfake Detection System for Windows...

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher from python.org
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js from nodejs.org
    pause
    exit /b 1
)

:: Create virtual environment
echo 📦 Creating virtual environment...
python -m venv deepfake-env

:: Install backend dependencies
echo 📥 Installing backend dependencies...
call deepfake-env\Scripts\activate.bat

:: Upgrade pip correctly
python -m pip install --upgrade pip

:: Install backend requirements with compatible versions
cd backend
pip install -r requirements-windows.txt
cd ..

:: Install frontend dependencies
echo 📥 Installing frontend dependencies...
cd frontend
call npm install
cd ..

:: Create necessary directories
mkdir logs uploads models\pretrained >nul 2>&1

:: Download/create models
echo 🤖 Setting up models...
python models\download_models.py

echo ✅ Setup completed successfully!
echo.
echo 🎯 To start the application:
echo 1. Backend: Run 'start-backend.bat'
echo 2. Frontend: Run 'start-frontend.bat' 
echo 3. Open http://localhost:3000 in your browser
echo.
pause