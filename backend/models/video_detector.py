# backend/models/video_detector.py
import cv2
import numpy as np
from .detector import DeepfakeDetector
import tempfile
import os
from collections import deque
import threading
import time

class VideoDeepfakeDetector:
    def __init__(self, model_path=None, device='cuda'):
        self.detector = DeepfakeDetector(model_path, device)
        self.frame_buffer = deque(maxlen=30)  # Store last 30 frames
        self.detection_history = deque(maxlen=10)  # Store last 10 results
        
    def analyze_video_file(self, video_path, sample_rate=3):
        """Analyze entire video file for deepfakes"""
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            return {'error': 'Could not open video file'}
        
        frame_count = 0
        deepfake_detections = []
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        print(f"Analyzing video with {total_frames} frames...")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Process every nth frame to speed up analysis
            if frame_count % sample_rate != 0:
                continue
            
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect deepfake
            result = self.detector.detect_from_array(rgb_frame)
            result['frame_number'] = frame_count
            deepfake_detections.append(result)
            
            # Progress update
            if frame_count % (sample_rate * 30) == 0:  # Every 30 processed frames
                progress = (frame_count / total_frames) * 100
                print(f"Progress: {progress:.1f}%")
        
        cap.release()
        
        # Analyze results
        return self._analyze_results(deepfake_detections, total_frames)
    
    def _analyze_results(self, detections, total_frames):
        """Analyze detection results and determine if video is deepfake"""
        if not detections:
            return {'error': 'No frames could be analyzed'}
        
        # Calculate statistics
        deepfake_count = sum(1 for d in detections if d['is_deepfake'])
        total_detections = len(detections)
        deepfake_percentage = (deepfake_count / total_detections) * 100
        
        # Average confidence
        avg_confidence = np.mean([d['confidence'] for d in detections])
        avg_processing_time = np.mean([d['processing_time_ms'] for d in detections])
        
        # Determine final result
        is_deepfake_video = deepfake_percentage > 30  # If >30% frames are deepfake
        
        return {
            'is_deepfake': is_deepfake_video,
            'confidence': avg_confidence,
            'deepfake_percentage': round(deepfake_percentage, 2),
            'frames_analyzed': total_detections,
            'total_frames': total_frames,
            'avg_processing_time_ms': round(avg_processing_time, 2),
            'frame_details': detections[:5]  # Return first 5 for inspection
        }
    
    def analyze_realtime_frame(self, frame):
        """Analyze single frame for real-time detection"""
        # Add frame to buffer
        self.frame_buffer.append(frame)
        
        # Detect deepfake
        result = self.detector.detect_from_array(frame)
        
        # Add to history
        self.detection_history.append(result)
        
        # Calculate temporal consistency
        if len(self.detection_history) >= 5:
            recent_detections = list(self.detection_history)[-5:]
            consistency_score = self._calculate_temporal_consistency(recent_detections)
            result['temporal_consistency'] = consistency_score
            
            # Adjust confidence based on consistency
            if consistency_score > 0.8:
                result['adjusted_confidence'] = min(result['confidence'] * 1.1, 1.0)
            else:
                result['adjusted_confidence'] = result['confidence'] * 0.9
        else:
            result['temporal_consistency'] = 0.5
            result['adjusted_confidence'] = result['confidence']
        
        return result
    
    def _calculate_temporal_consistency(self, detections):
        """Calculate how consistent recent detections are"""
        if len(detections) < 2:
            return 0.5
        
        # Check if recent predictions are consistent
        predictions = [d['is_deepfake'] for d in detections]
        consistency = sum(predictions) / len(predictions)
        
        # Return consistency score (0 = very inconsistent, 1 = very consistent)
        return abs(consistency - 0.5) * 2

# Test video detector
if __name__ == "__main__":
    video_detector = VideoDeepfakeDetector()
    
    # Test with video file
    result = video_detector.analyze_video_file('test_video.mp4')
    print(f"Video analysis result: {result}")