import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
import mediapipe as mp
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DeepFakeDetector:
    def __init__(self, model_path=None, confidence_threshold=0.85):
        self.confidence_threshold = confidence_threshold
        self.face_detection = mp.solutions.face_detection.FaceDetection(
            model_selection=1, min_detection_confidence=0.7
        )
        self.model = self.load_model(model_path)
        self.input_size = (128, 128)  # Expected input size for the model
        
    def load_model(self, model_path):
        """Load the deepfake detection model"""
        try:
            if model_path and tf.io.gfile.exists(model_path):
                model = load_model(model_path)
                logger.info(f"Model loaded successfully from {model_path}")
            else:
                # Create a simple CNN model if no pre-trained model is available
                model = self.create_default_model()
                logger.info("Using default model architecture")
            return model
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return self.create_default_model()
    
    def create_default_model(self):
        """Create a simple CNN model for deepfake detection"""
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
        
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        return model
    
    def detect_faces(self, image):
        """Detect faces in the image using MediaPipe"""
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_detection.process(rgb_image)
        
        faces = []
        if results.detections:
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                h, w, _ = image.shape
                
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                
                # Expand bounding box slightly
                x = max(0, x - 20)
                y = max(0, y - 20)
                width = min(w - x, width + 40)
                height = min(h - y, height + 40)
                
                faces.append((x, y, width, height))
        
        return faces
    
    def preprocess_face(self, face_roi):
        """Preprocess face ROI for model prediction"""
        # Resize to model input size
        face_resized = cv2.resize(face_roi, self.input_size)
        
        # Normalize pixel values
        face_normalized = face_resized.astype('float32') / 255.0
        
        # Expand dimensions for batch prediction
        face_expanded = np.expand_dims(face_normalized, axis=0)
        
        return face_expanded
    
    def analyze_frame(self, frame):
        """Analyze a single frame for deepfake content"""
        try:
            # Detect faces in the frame
            faces = self.detect_faces(frame)
            
            if not faces:
                return {
                    'deepfake_detected': False,
                    'confidence': 0.0,
                    'faces_detected': 0,
                    'message': 'No faces detected'
                }
            
            results = []
            for i, (x, y, w, h) in enumerate(faces):
                # Extract face ROI
                face_roi = frame[y:y+h, x:x+w]
                
                if face_roi.size == 0:
                    continue
                
                # Preprocess face for model
                processed_face = self.preprocess_face(face_roi)
                
                # Predict deepfake probability
                prediction = self.model.predict(processed_face, verbose=0)[0][0]
                
                # Convert to confidence score (1.0 = real, 0.0 = fake)
                confidence_real = float(prediction)
                is_deepfake = confidence_real < self.confidence_threshold
                
                results.append({
                    'face_id': i,
                    'bbox': [x, y, w, h],
                    'confidence_real': confidence_real,
                    'confidence_fake': 1.0 - confidence_real,
                    'is_deepfake': is_deepfake
                })
            
            # Overall frame result
            if results:
                avg_confidence = np.mean([r['confidence_real'] for r in results])
                deepfake_detected = any(r['is_deepfake'] for r in results)
                
                return {
                    'deepfake_detected': deepfake_detected,
                    'confidence': float(avg_confidence),
                    'faces_detected': len(faces),
                    'face_results': results,
                    'message': f'Detected {len(faces)} face(s)'
                }
            else:
                return {
                    'deepfake_detected': False,
                    'confidence': 0.0,
                    'faces_detected': 0,
                    'message': 'Faces detected but unable to process'
                }
                
        except Exception as e:
            logger.error(f"Error analyzing frame: {e}")
            return {
                'deepfake_detected': False,
                'confidence': 0.0,
                'faces_detected': 0,
                'message': f'Error: {str(e)}'
            }
    
    def process_video_stream(self, video_path=None, camera_index=0):
        """Process video stream for real-time detection"""
        try:
            if video_path:
                cap = cv2.VideoCapture(video_path)
            else:
                cap = cv2.VideoCapture(camera_index)
            
            if not cap.isOpened():
                raise Exception("Could not open video source")
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Analyze frame
                result = self.analyze_frame(frame)
                yield frame, result
                
            cap.release()
            
        except Exception as e:
            logger.error(f"Error processing video stream: {e}")
            raise