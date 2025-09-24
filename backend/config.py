import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'deepfake-detection-secret-key')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Model Configuration
    MODEL_PATH = os.getenv('MODEL_PATH', 'models/pretrained/deepfake_model.h5')
    CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.85'))
    
    # Video Processing
    FRAME_RATE = int(os.getenv('FRAME_RATE', '10'))
    MAX_FRAME_SIZE = int(os.getenv('MAX_FRAME_SIZE', '640'))
    
    # API Configuration
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Redis for SocketIO (if using multiple workers)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}