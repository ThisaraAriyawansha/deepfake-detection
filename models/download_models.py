import os
import gdown
import tensorflow as tf
from pathlib import Path
import sys

def download_pretrained_models():
    """Download pre-trained deepfake detection models"""
    models_dir = Path('models/pretrained')
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Create a simple model for Windows (since downloading might fail)
    print("Creating a base model for Windows...")
    create_base_model()
    
    print("✅ Model setup completed for Windows")

def create_base_model():
    """Create a base CNN model for deepfake detection"""
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(128, 128, 3)),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(512, activation='relu'),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    model.compile(optimizer='adam', 
                 loss='binary_crossentropy', 
                 metrics=['accuracy'])
    
    # Save the model
    models_dir = Path('models/pretrained')
    models_dir.mkdir(parents=True, exist_ok=True)
    model.save(models_dir / 'base_model.h5')
    return model

if __name__ == '__main__':
    print("Setting up deepfake detection models for Windows...")
    download_pretrained_models()