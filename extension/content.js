// Content script for video call platforms
class DeepfakeDetectorExtension {
  constructor() {
    this.isActive = false;
    this.videoElements = new Set();
    this.detectionInterval = null;
    this.initialize();
  }

  initialize() {
    console.log('Deepfake Detector Extension initialized');
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleDetection') {
        this.toggleDetection(request.enabled);
        sendResponse({ success: true });
      }
    });

    // Observe DOM for video elements
    this.observeVideoElements();
  }

  observeVideoElements() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            this.findVideoElements(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Find existing video elements
    this.findVideoElements(document.body);
  }

  findVideoElements(root) {
    const videos = root.querySelectorAll('video');
    videos.forEach(video => {
      if (!this.videoElements.has(video)) {
        this.videoElements.add(video);
        this.setupVideoDetection(video);
      }
    });
  }

  setupVideoDetection(video) {
    // Add overlay canvas for detection results
    const canvas = document.createElement('canvas');
    canvas.className = 'deepfake-detector-overlay';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1000';

    const container = video.parentElement;
    if (container.style.position !== 'absolute' && 
        container.style.position !== 'relative') {
      container.style.position = 'relative';
    }
    
    container.appendChild(canvas);

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });
  }

  async toggleDetection(enabled) {
    this.isActive = enabled;
    
    if (enabled) {
      this.startDetection();
    } else {
      this.stopDetection();
    }

    // Send status to background script
    chrome.runtime.sendMessage({
      action: 'detectionStatus',
      enabled: enabled
    });
  }

  startDetection() {
    console.log('Starting deepfake detection');
    
    this.detectionInterval = setInterval(() => {
      this.videoElements.forEach(video => {
        if (video.readyState === 4) { // HAVE_ENOUGH_DATA
          this.analyzeVideoFrame(video);
        }
      });
    }, 1000); // Analyze every second
  }

  stopDetection() {
    console.log('Stopping deepfake detection');
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    // Clear all overlays
    document.querySelectorAll('.deepfake-detector-overlay').forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }

  async analyzeVideoFrame(video) {
    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg');
      
      // Send to backend for analysis
      const response = await this.sendToBackend(imageData);
      
      if (response) {
        this.displayResults(video, response);
      }
    } catch (error) {
      console.error('Error analyzing video frame:', error);
    }
  }

  async sendToBackend(imageData) {
    try {
      const response = await fetch('http://localhost:5000/api/detect/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData.split(',')[1],
          return_image: true
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Error sending to backend:', error);
      return null;
    }
  }

  displayResults(video, analysis) {
    const container = video.parentElement;
    const overlay = container.querySelector('.deepfake-detector-overlay');
    
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Draw bounding boxes and labels
    if (analysis.face_results) {
      analysis.face_results.forEach(face => {
        const [x, y, w, h] = face.bbox;
        const isDeepfake = face.is_deepfake;
        
        // Draw bounding box
        ctx.strokeStyle = isDeepfake ? '#ff0000' : '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
        
        // Draw label background
        ctx.fillStyle = isDeepfake ? 'rgba(255, 0, 0, 0.7)' : 'rgba(0, 255, 0, 0.7)';
        ctx.fillRect(x, y - 25, w, 25);
        
        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(
          `${isDeepfake ? 'FAKE' : 'REAL'} (${(face.confidence_real * 100).toFixed(1)}%)`,
          x + 5, y - 8
        );
      });
    }

    // Draw overall status
    if (analysis.deepfake_detected) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('🚨 DEEPFAKE DETECTED', 20, 35);
    }
  }
}

// Initialize extension when content script loads
const detectorExtension = new DeepfakeDetectorExtension();