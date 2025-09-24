from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import cv2
import base64
import logging
from config import config
from models.detector import DeepFakeDetector
from models.utils import base64_to_image, image_to_base64, draw_detection_results

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config['default'])

# Enable CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize DeepFake Detector
detector = DeepFakeDetector(
    model_path=app.config['MODEL_PATH'],
    confidence_threshold=app.config['CONFIDENCE_THRESHOLD']
)

@app.route('/')
def hello():
    return jsonify({
        'message': 'Deepfake Detection API',
        'status': 'running',
        'version': '1.0.0'
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'model_loaded': detector.model is not None})

@app.route('/api/detect/image', methods=['POST'])
def detect_image():
    """Endpoint for single image detection"""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Convert base64 to image
        image = base64_to_image(data['image'])
        
        # Analyze image
        result = detector.analyze_frame(image)
        
        # Draw results on image if requested
        if data.get('return_image', False):
            result_image = draw_detection_results(image, result)
            result['annotated_image'] = image_to_base64(result_image)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in image detection: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/detect/video', methods=['POST'])
def detect_video():
    """Endpoint for video file detection"""
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        
        # Save temporary video file
        video_path = f"/tmp/{video_file.filename}"
        video_file.save(video_path)
        
        # Process video
        results = []
        for frame, result in detector.process_video_stream(video_path=video_path):
            results.append(result)
        
        # Calculate overall video result
        if results:
            deepfake_frames = sum(1 for r in results if r['deepfake_detected'])
            total_frames = len(results)
            deepfake_percentage = (deepfake_frames / total_frames) * 100
            
            overall_result = {
                'deepfake_detected': deepfake_percentage > 50,  # Majority voting
                'deepfake_percentage': deepfake_percentage,
                'total_frames': total_frames,
                'deepfake_frames': deepfake_frames,
                'frame_results': results
            }
        else:
            overall_result = {'error': 'No frames processed'}
        
        return jsonify(overall_result)
        
    except Exception as e:
        logger.error(f"Error in video detection: {e}")
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')
    emit('status', {'message': 'Connected to deepfake detection server'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

@socketio.on('start_stream')
def handle_start_stream(data):
    """Handle real-time video stream via WebSocket"""
    try:
        logger.info('Starting real-time stream')
        
        # Process frames in real-time
        for frame, result in detector.process_video_stream(camera_index=0):
            # Convert frame to base64 for streaming
            frame_base64 = image_to_base64(frame)
            
            # Emit result to client
            emit('frame_result', {
                'frame': frame_base64,
                'analysis': result
            })
            
    except Exception as e:
        logger.error(f"Error in real-time stream: {e}")
        emit('error', {'message': str(e)})

@socketio.on('analyze_frame')
def handle_analyze_frame(data):
    """Analyze a single frame sent via WebSocket"""
    try:
        if 'image' not in data:
            emit('error', {'message': 'No image data provided'})
            return
        
        # Convert base64 to image
        image = base64_to_image(data['image'])
        
        # Analyze frame
        result = detector.analyze_frame(image)
        
        # Draw results on image
        result_image = draw_detection_results(image, result)
        result_base64 = image_to_base64(result_image)
        
        emit('analysis_result', {
            'annotated_frame': result_base64,
            'analysis': result
        })
        
    except Exception as e:
        logger.error(f"Error in frame analysis: {e}")
        emit('error', {'message': str(e)})

if __name__ == '__main__':
    logger.info("Starting Deepfake Detection API Server")
    socketio.run(app, 
                host='0.0.0.0', 
                port=5000, 
                debug=app.config['DEBUG'],
                allow_unsafe_werkzeug=True)