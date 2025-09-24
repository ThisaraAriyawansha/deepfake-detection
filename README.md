# 🚨 Real-Time Deepfake Detection System

A comprehensive deepfake detection system that provides real-time analysis of live video streams, images, and video files using advanced machine learning models.

![Deepfake Detection](https://img.shields.io/badge/Deepfake-Detection-blue)
![Real-Time](https://img.shields.io/badge/Real--Time-Analysis-green)
![AI-Powered](https://img.shields.io/badge/AI-Powered-orange)

## 🌟 Features

### 🔍 Real-Time Detection
- **Live Video Analysis**: Real-time deepfake detection from webcam feeds
- **Image Detection**: Upload and analyze single images for authenticity
- **Video File Analysis**: Process pre-recorded videos for deepfake content
- **Browser Extension**: Integrates with video call platforms (Google Meet, Zoom, Teams)

### 🎯 Advanced Technology
- **Multi-Model Architecture**: Ensemble of deep learning models for accurate detection
- **Face Detection & Analysis**: Advanced facial feature extraction using MediaPipe
- **Confidence Scoring**: Probability-based results with adjustable thresholds
- **Real-Time Visualization**: Live bounding boxes and detection overlays

### 💻 User Experience
- **Responsive Web Interface**: Modern React.js dashboard with real-time analytics
- **Browser Extension**: Seamless integration with popular video conferencing tools
- **RESTful API**: Easy integration with other applications
- **Docker Support**: Containerized deployment for easy setup

## 📊 Technology Stack

### Frontend
- **React.js** - Modern user interface
- **Chart.js** - Analytics and visualization
- **Socket.io Client** - Real-time communication
- **Webpack** - Build tool and bundler

### Backend
- **Flask** - RESTful API server
- **TensorFlow/Keras** - Deep learning models
- **OpenCV** - Computer vision processing
- **MediaPipe** - Face detection and analysis
- **Socket.io** - WebSocket communication

### Machine Learning
- **CNN Architectures** - Custom deepfake detection models
- **Transfer Learning** - Pre-trained model optimization
- **Real-time Inference** - Optimized for live video processing

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- Modern web browser with camera access

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ThisaraAriyawansha/deepfake-detection.git
cd deepfake-detector

# Create virtual environment
python -m venv deepfake-env
source deepfake-env/bin/activate  # Linux/Mac
deepfake-env\Scripts\activate.bat  # Windows

# Install dependencies
pip install -r backend/requirements.txt

# Download models
python models/download_models.py

deepfake-detector/
├── 📁 backend/                 # Flask API + ML Models
│   ├── app.py                 # Main API server
│   ├── config.py              # Configuration settings  
│   ├── requirements.txt       # Python dependencies
│   └── models/
│       ├── detector.py        # ML detection models
│       └── utils.py           # Utility functions
├── 📁 frontend/               # React Web Application
│   ├── public/index.html      # Main web interface
│   ├── src/
│   │   ├── App.js             # React main component
│   │   ├── components/
│   │   │   ├── VideoDetector.js  # Live detection
│   │   │   ├── Dashboard.js      # Analytics dashboard
│   │   │   └── Settings.js       # Configuration
│   │   └── utils/
│   │       └── api.js         # API communication
│   ├── package.json           # Node dependencies
│   └── webpack.config.js      # Build configuration
├── 📁 extension/              # Browser Extension
│   ├── manifest.json          # Extension config
│   ├── content.js             # Video call integration
│   └── popup.html             # Extension popup
├── 📁 models/                 # ML Training & Optimization
│   ├── download_models.py     # Download pre-trained models
│   └── train_deepfake.py      # Training script
└── 📁 docker/                 # Production Deployment
    ├── Dockerfile             # Container configuration
    └── docker-compose.yml     # Multi-service setup
