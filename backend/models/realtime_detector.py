# backend/models/realtime_detector.py
import cv2
import numpy as np
import torch
import threading
import queue
import time
from .detector import DeepfakeDetector
from collections import deque

class RealTimeDeepfakeDetector:
    def __init__(self, model_path=None, device='cuda'):
        self.detector = DeepfakeDetector(model_path, device)
        
        # Optimization settings
        self.input_size = (112, 112)  # Smaller for speed
        self.process_every_n_frames = 3  # Skip frames for speed
        self.frame_buffer_size = 10
        
        # Threading for real-time processing
        self.frame_queue = queue.Queue(maxsize=5)
        self.result_queue = queue.Queue(maxsize=10)
        self.is_processing = False
        self.processing_thread = None
        
        # Results tracking
        self.recent_results = deque(maxlen=10)
        self.frame_count = 0
        
    def start_processing(self):
        """Start the real-time processing thread"""
        if not self.is_processing:
            self.is_processing = True
            self.processing_thread = threading.Thread(target=self._processing_loop)
            self.processing_thread.daemon = True
            self.processing_thread.start()
            print("✅ Real-time processing started")
    
    def stop_processing(self):
        """Stop the real-time processing"""
        self.is_processing = False
        if self.processing_thread:
            self.processing_thread.join()
        print("🛑 Real-time processing stopped")
    
    def process_frame(self, frame):
        """Add frame to processing queue"""
        if not self.is_processing:
            self.start_processing()
        
        self.frame_count += 1
        
        # Only process every nth frame
        if self.frame_count % self.process_every_n_frames != 0:
            return self._get_latest_result()
        
        # Resize frame for speed
        small_frame = cv2.resize(frame, self.input_size)
        
        # Add to queue (non-blocking)
        try:
            self.frame_queue.put(small_frame, block=False)
        except queue.Full:
            # Queue full, skip this frame
            pass
        
        return self._get_latest_result()
    
    def _processing_loop(self):
        """Main processing loop running in separate thread"""
        while self.is_processing:
            try:
                # Get frame from queue
                frame = self.frame_queue.get(timeout=0.1)
                
                # Process frame
                start_time = time.time()
                result = self.detector.detect_from_array(frame)
                processing_time = (time.time() - start_time) * 1000
                
                # Add metadata
                result['timestamp'] = time.time()
                result['processing_time_ms'] = processing_time
                result['frame_size'] = self.input_size
                
                # Store result
                self.recent_results.append(result)
                
                # Put result in output queue
                try:
                    self.result_queue.put(result, block=False)
                except queue.Full:
                    # Remove oldest result to make space
                    try:
                        self.result_queue.get(block=False)
                        self.result_queue.put(result, block=False)
                    except queue.Empty:
                        pass
                
            except queue.Empty:
                # No frames to process, continue
                continue
            except Exception as e:
                print(f"Error in processing loop: {e}")
    
    def _get_latest_result(self):
        """Get the most recent detection result"""
        try:
            # Get latest result from queue
            result = self.result_queue.get(block=False)
            return result
        except queue.Empty:
            # No new results, return last known result or default
            if self.recent_results:
                return self.recent_results[-1]
            else:
                return {
                    'is_deepfake': False,
                    'confidence': 0.0,
                    'processing_time_ms': 0,
                    'status': 'waiting_for_first_result'
                }
    
    def get_statistics(self):
        """Get processing statistics"""
        if not self.recent_results:
            return {'status': 'no_data'}
        
        recent = list(self.recent_results)[-10:]  # Last 10 results
        
        avg_confidence = np.mean([r['confidence'] for r in recent])
        avg_processing_time = np.mean([r.get('processing_time_ms', 0) for r in recent])
        deepfake_percentage = (sum(r['is_deepfake'] for r in recent) / len(recent)) * 100
        
        return {
            'frames_processed': len(self.recent_results),
            'avg_confidence': round(avg_confidence, 3),
            'avg_processing_time_ms': round(avg_processing_time, 2),
            'deepfake_percentage': round(deepfake_percentage, 1),
            'fps': round(1000 / avg_processing_time if avg_processing_time > 0 else 0, 1),
            'status': 'active' if self.is_processing else 'stopped'
        }

# Webcam testing application
class WebcamDeepfakeTest:
    def __init__(self):
        self.detector = RealTimeDeepfakeDetector()
        self.cap = cv2.VideoCapture(0)  # Default webcam
        
        if not self.cap.isOpened():
            raise ValueError("Could not open webcam")
        
        # Set webcam properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        self.cap.set(cv2.CAP_PROP_FPS, 30)
    
    def run(self):
        """Run webcam deepfake detection"""
        print("Starting webcam deepfake detection...")
        print("Press 'q' to quit, 's' to show stats")
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            # Process frame
            result = self.detector.process_frame(frame)
            
            # Draw results on frame
            self._draw_results(frame, result)
            
            # Show frame
            cv2.imshow('Real-Time Deepfake Detection', frame)
            
            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                stats = self.detector.get_statistics()
                print(f"\n📊 Statistics: {stats}")
        
        # Cleanup
        self.cap.release()
        cv2.destroyAllWindows()
        self.detector.stop_processing()
    
    def _draw_results(self, frame, result):
        """Draw detection results on frame"""
        # Determine colors and text
        if result.get('status') == 'waiting_for_first_result':
            color = (0, 255, 255)  # Yellow
            text = "Initializing..."
            confidence_text = ""
        elif result['is_deepfake']:
            color = (0, 0, 255)  # Red
            text = "DEEPFAKE DETECTED!"
            confidence_text = f"Confidence: {result['confidence']:.1%}"
        else:
            color = (0, 255, 0)  # Green
            text = "AUTHENTIC"
            confidence_text = f"Confidence: {result['confidence']:.1%}"
        
        # Draw background rectangle
        cv2.rectangle(frame, (10, 10), (400, 80), (0, 0, 0), -1)
        cv2.rectangle(frame, (10, 10), (400, 80), color, 2)
        
        # Draw text
        cv2.putText(frame, text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        if confidence_text:
            cv2.putText(frame, confidence_text, (20, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Draw processing time
        if 'processing_time_ms' in result:
            time_text = f"Processing: {result['processing_time_ms']:.1f}ms"
            cv2.putText(frame, time_text, (20, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)

if __name__ == "__main__":
    try:
        webcam_test = WebcamDeepfakeTest()
        webcam_test.run()
    except Exception as e:
        print(f"Error: {e}")