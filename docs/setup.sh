#!/bin/bash

echo "🚀 Setting up Deepfake Detection System..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv deepfake-env
source deepfake-env/bin/activate

# Install backend dependencies
echo "📥 Installing backend dependencies..."
pip install --upgrade pip
pip install -r backend/requirements.txt

# Install frontend dependencies
echo "📥 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Download pre-trained models
echo "🤖 Downloading pre-trained models..."
python models/download_models.py

# Create necessary directories
mkdir -p logs uploads models/pretrained

echo "✅ Setup completed successfully!"
echo ""
echo "🎯 To start the application:"
echo "1. Backend: source deepfake-env/bin/activate && python backend/app.py"
echo "2. Frontend: cd frontend && npm run dev"
echo "3. Open http://localhost:3000 in your browser"