import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
import numpy as np
import os
from pathlib import Path
import argparse

class DeepFakeTrainer:
    def __init__(self, data_dir, model_save_path='models/pretrained/trained_model.h5'):
        self.data_dir = Path(data_dir)
        self.model_save_path = Path(model_save_path)
        self.model = None
        self.history = None
        
    def prepare_data_generators(self, batch_size=32, img_size=(128, 128)):
        """Prepare data generators for training and validation"""
        
        # Data augmentation for training
        train_datagen = ImageDataGenerator(
            rescale=1./255,
            rotation_range=20,
            width_shift_range=0.2,
            height_shift_range=0.2,
            horizontal_flip=True,
            zoom_range=0.2,
            validation_split=0.2  # Use 20% for validation
        )
        
        # Only rescaling for validation
        val_datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)
        
        # Training generator
        train_generator = train_datagen.flow_from_directory(
            self.data_dir,
            target_size=img_size,
            batch_size=batch_size,
            class_mode='binary',
            subset='training'
        )
        
        # Validation generator
        val_generator = val_datagen.flow_from_directory(
            self.data_dir,
            target_size=img_size,
            batch_size=batch_size,
            class_mode='binary',
            subset='validation'
        )
        
        return train_generator, val_generator
    
    def create_model(self, base_model_name='efficientnet', input_shape=(128, 128, 3)):
        """Create a deepfake detection model"""
        
        if base_model_name == 'efficientnet':
            # Use EfficientNet as base
            base_model = EfficientNetB0(
                weights='imagenet',
                include_top=False,
                input_shape=input_shape
            )
            base_model.trainable = False  # Freeze base model initially
            
            # Add custom layers
            x = base_model.output
            x = GlobalAveragePooling2D()(x)
            x = Dense(128, activation='relu')(x)
            x = Dropout(0.3)(x)
            predictions = Dense(1, activation='sigmoid')(x)
            
            self.model = Model(inputs=base_model.input, outputs=predictions)
            
        else:
            # Simple CNN model
            self.model = tf.keras.Sequential([
                tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
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
        
        # Compile the model
        self.model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy', 'precision', 'recall']
        )
        
        return self.model
    
    def train(self, epochs=50, batch_size=32, fine_tune_epochs=10):
        """Train the deepfake detection model"""
        
        # Prepare data
        train_gen, val_gen = self.prepare_data_generators(batch_size=batch_size)
        
        # Create model
        if self.model is None:
            self.create_model()
        
        # Callbacks
        callbacks = [
            tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
            tf.keras.callbacks.ReduceLROnPlateau(factor=0.2, patience=3),
            tf.keras.callbacks.ModelCheckpoint(
                self.model_save_path,
                save_best_only=True,
                monitor='val_accuracy'
            )
        ]
        
        # Initial training with frozen base
        print("Phase 1: Training with frozen base layers...")
        history1 = self.model.fit(
            train_gen,
            epochs=epochs,
            validation_data=val_gen,
            callbacks=callbacks,
            verbose=1
        )
        
        # Fine-tuning (unfreeze some layers)
        if hasattr(self.model.layers[0], 'trainable'):
            print("Phase 2: Fine-tuning...")
            self.model.layers[0].trainable = True
            
            # Recompile with lower learning rate
            self.model.compile(
                optimizer=Adam(learning_rate=0.0001),
                loss='binary_crossentropy',
                metrics=['accuracy', 'precision', 'recall']
            )
            
            history2 = self.model.fit(
                train_gen,
                epochs=fine_tune_epochs,
                validation_data=val_gen,
                callbacks=callbacks,
                verbose=1
            )
            
            # Combine histories
            self.history = {
                k: history1.history[k] + history2.history[k] 
                for k in history1.history.keys()
            }
        else:
            self.history = history1.history
        
        # Save final model
        self.model.save(self.model_save_path)
        print(f"✅ Model saved to {self.model_save_path}")
        
        return self.history
    
    def evaluate(self, test_dir=None):
        """Evaluate the trained model"""
        if test_dir:
            test_datagen = ImageDataGenerator(rescale=1./255)
            test_generator = test_datagen.flow_from_directory(
                test_dir,
                target_size=(128, 128),
                batch_size=32,
                class_mode='binary',
                shuffle=False
            )
            
            evaluation = self.model.evaluate(test_generator)
            print(f"Test Loss: {evaluation[0]:.4f}")
            print(f"Test Accuracy: {evaluation[1]:.4f}")
            
            return evaluation

def main():
    parser = argparse.ArgumentParser(description='Train deepfake detection model')
    parser.add_argument('--data_dir', type=str, required=True, 
                       help='Path to training data directory')
    parser.add_argument('--epochs', type=int, default=50, 
                       help='Number of training epochs')
    parser.add_argument('--batch_size', type=int, default=32, 
                       help='Batch size for training')
    
    args = parser.parse_args()
    
    # Train the model
    trainer = DeepFakeTrainer(args.data_dir)
    trainer.create_model()
    history = trainer.train(epochs=args.epochs, batch_size=args.batch_size)
    
    print("✅ Training completed successfully!")

if __name__ == '__main__':
    main()