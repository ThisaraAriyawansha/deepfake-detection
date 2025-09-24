import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
import os

def build_model():
    base_model = EfficientNetB0(weights='imagenet', include_top=False)
    x = GlobalAveragePooling2D()(base_model.output)
    x = Dense(1, activation='sigmoid')(x)
    model = Model(inputs=base_model.input, outputs=x)
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def train(model, train_data, val_data, epochs=10):
    model.fit(train_data, validation_data=val_data, epochs=epochs)
    model.save('deepfake_model.h5')

# Usage: Load datasets and call train()