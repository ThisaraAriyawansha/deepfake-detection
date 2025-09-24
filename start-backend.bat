@echo off
echo Starting Deepfake Detection Backend...
call deepfake-env\Scripts\activate.bat
cd backend
python app.py
pause