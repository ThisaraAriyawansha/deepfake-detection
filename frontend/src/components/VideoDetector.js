import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import './VideoDetector.css';

const VideoDetector = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
// With this:
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const newSocket = io(API_URL);    
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Connected to server');
    });
    
    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('Disconnected from server');
    });
    
    newSocket.on('frame_result', (data) => {
      displayAnnotatedFrame(data.frame, data.analysis);
      setAnalysisResult(data.analysis);
    });
    
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionStatus('error');
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      await videoRef.current.play();
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Error accessing camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startDetection = async () => {
    if (!socket || connectionStatus !== 'connected') {
      alert('Not connected to server');
      return;
    }

    await startCamera();
    setIsDetecting(true);
    socket.emit('start_stream');
  };

  const stopDetection = () => {
    setIsDetecting(false);
    stopCamera();
    setAnalysisResult(null);
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const displayAnnotatedFrame = (frameBase64, analysis) => {
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = `data:image/jpeg;base64,${frameBase64}`;
  };

  const captureAndAnalyzeFrame = () => {
    if (!videoRef.current || !socket) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    socket.emit('analyze_frame', { image: imageData.split(',')[1] });
  };

  return (
    <div className="video-detector">
      <div className="detector-header">
        <h1>Real-Time Deepfake Detection</h1>
        <div className="status-indicators">
          <div className={`status connection-${connectionStatus}`}>
            Server: {connectionStatus}
          </div>
          <div className={`status detection-${isDetecting ? 'active' : 'inactive'}`}>
            Detection: {isDetecting ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      <div className="detection-area">
        <div className="video-container">
          <video 
            ref={videoRef} 
            className="video-feed"
            muted
            playsInline
          />
          <canvas 
            ref={canvasRef} 
            className="analysis-overlay"
          />
        </div>

        <div className="controls">
          <button 
            onClick={isDetecting ? stopDetection : startDetection}
            className={`btn ${isDetecting ? 'btn-stop' : 'btn-start'}`}
          >
            {isDetecting ? 'Stop Detection' : 'Start Detection'}
          </button>
          
          <button 
            onClick={captureAndAnalyzeFrame}
            className="btn btn-capture"
            disabled={!streamRef.current}
          >
            Analyze Frame
          </button>
        </div>
      </div>

      {analysisResult && (
        <div className="results-panel">
          <h3>Analysis Results</h3>
          <div className={`result-alert ${analysisResult.deepfake_detected ? 'alert-fake' : 'alert-real'}`}>
            {analysisResult.deepfake_detected ? '🚨 DEEPFAKE DETECTED!' : '✅ AUTHENTIC CONTENT'}
          </div>
          
          <div className="result-details">
            <p>Faces Detected: {analysisResult.faces_detected}</p>
            <p>Confidence: {(analysisResult.confidence * 100).toFixed(2)}%</p>
            <p>Message: {analysisResult.message}</p>
          </div>

          {analysisResult.face_results && (
            <div className="face-results">
              <h4>Face Analysis:</h4>
              {analysisResult.face_results.map((face, index) => (
                <div key={index} className="face-result">
                  <span>Face {face.face_id + 1}: </span>
                  <span className={face.is_deepfake ? 'result-fake' : 'result-real'}>
                    {face.is_deepfake ? 'FAKE' : 'REAL'} 
                    ({(face.confidence_real * 100).toFixed(2)}% real)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoDetector;