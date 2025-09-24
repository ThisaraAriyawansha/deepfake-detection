import cv2
import base64
import numpy as np
from PIL import Image
import io

def base64_to_image(base64_string):
    """Convert base64 string to OpenCV image"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Error converting base64 to image: {e}")

def image_to_base64(image):
    """Convert OpenCV image to base64 string"""
    try:
        _, buffer = cv2.imencode('.jpg', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        return image_base64
    except Exception as e:
        raise ValueError(f"Error converting image to base64: {e}")

def draw_detection_results(image, results):
    """Draw detection results on the image"""
    output_image = image.copy()
    
    if 'face_results' in results:
        for face in results['face_results']:
            x, y, w, h = face['bbox']
            is_deepfake = face['is_deepfake']
            confidence = face['confidence_fake'] if is_deepfake else face['confidence_real']
            
            # Choose color based on detection result
            color = (0, 0, 255) if is_deepfake else (0, 255, 0)  # Red for fake, Green for real
            
            # Draw bounding box
            cv2.rectangle(output_image, (x, y), (x + w, y + h), color, 2)
            
            # Draw label
            label = f"{'FAKE' if is_deepfake else 'REAL'}: {confidence:.2f}"
            cv2.putText(output_image, label, (x, y - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
    
    # Add overall status
    status = "DEEPFAKE DETECTED!" if results['deepfake_detected'] else "AUTHENTIC"
    status_color = (0, 0, 255) if results['deepfake_detected'] else (0, 255, 0)
    cv2.putText(output_image, status, (10, 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
    
    return output_image