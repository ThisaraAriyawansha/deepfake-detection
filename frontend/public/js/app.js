// frontend/public/js/app.js
class DeepfakeDetectorApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000/api';
        this.currentMode = null;
        this.webcamStream = null;
        this.detectionInterval = null;
        this.isProcessing = false;
        this.statistics = {
            framesProcessed: 0,
            totalProcessingTime: 0,
            detectionCount: 0
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Deepfake Detector App...');
        
        // Check API connection
        await this.checkApiConnection();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateConnectionStatus('connected');
        
        console.log('✅ App initialized successfully');
    }
    
    async checkApiConnection() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.updateConnectionStatus('connected');
                document.getElementById('api-status').textContent = 'Connected';
                document.getElementById('model-status').textContent = 'Ready';
                document.getElementById('perf-status').textContent = 'Optimal';
            }
        } catch (error) {
            console.error('API connection failed:', error);
            this.updateConnectionStatus('disconnected');
            document.getElementById('api-status').textContent = 'Disconnected';
            document.getElementById('model-status').textContent = 'Unavailable';
            document.getElementById('perf-status').textContent = 'Poor';
        }
    }
    
    updateConnectionStatus(status) {
        const indicator = document.querySelector('#connection-status .status-indicator');
        const text = document.querySelector('#connection-status span');
        
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'connected':
                indicator.classList.add('status-real');
                text.textContent = 'Connected';
                break;
            case 'disconnected':
                indicator.classList.add('status-fake');
                text.textContent = 'Disconnected';
                break;
            case 'connecting':
                indicator.classList.add('status-loading');
                text.textContent = 'Connecting...';
                break;
        }
    }
    
    setupEventListeners() {
        // Mode selection
        document.getElementById('mode-webcam').addEventListener('click', () => this.setMode('webcam'));
        document.getElementById('mode-upload').addEventListener('click', () => this.setMode('upload'));
        document.getElementById('mode-image').addEventListener('click', () => this.setMode('image'));
        
        // Webcam controls
        document.getElementById('start-camera').addEventListener('click', () => this.startWebcam());
        document.getElementById('stop-camera').addEventListener('click', () => this.stopWebcam());
        
        // Settings
        document.getElementById('sensitivity-slider').addEventListener('input', (e) => {
            this.updateSettings({ sensitivity: parseFloat(e.target.value) });
        });
        
        document.getElementById('frequency-select').addEventListener('change', (e) => {
            this.updateSettings({ frequency: parseInt(e.target.value) });
        });
        
        // File uploads
        document.getElementById('video-upload').addEventListener('change', (e) => this.handleVideoUpload(e));
        document.getElementById('image-upload').addEventListener('change', (e) => this.handleImageUpload(e));
        
        // Drag and drop for video upload
        const uploadSection = document.getElementById('upload-section');
        uploadSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadSection.classList.add('bg-blue-50');
        });
        
        uploadSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('bg-blue-50');
        });
        
        uploadSection.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadSection.classList.remove('bg-blue-50');
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('video/')) {
                document.getElementById('video-upload').files = files;
                this.handleVideoUpload({ target: { files } });
            }
        });
    }
    
    setMode(mode) {
        // Hide all sections
        document.getElementById('webcam-section').classList.add('hidden');
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('image-section').classList.add('hidden');
        
        // Reset mode buttons
        document.querySelectorAll('.mode-button').forEach(btn => {
            btn.classList.remove('border-blue-500', 'bg-blue-50');
            btn.classList.add('border-gray-200');
        });
        
        // Activate selected mode
        const selectedButton = document.getElementById(`mode-${mode}`);
        selectedButton.classList.remove('border-gray-200');
        selectedButton.classList.add('border-blue-500', 'bg-blue-50');
        
        // Show selected section
        document.getElementById(`${mode}-section`).classList.remove('hidden');
        
        this.currentMode = mode;
        
        // Stop webcam if switching away from webcam mode
        if (mode !== 'webcam' && this.webcamStream) {
            this.stopWebcam();
        }
    }
    
    async startWebcam() {
        try {
            console.log('🎥 Starting webcam...');
            
            // Get user media
            this.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            
            // Setup video element
            const video = document.getElementById('webcam-video');
            const placeholder = document.getElementById('camera-placeholder');
            const overlay = document.getElementById('detection-overlay');
            
            video.srcObject = this.webcamStream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
            overlay.classList.remove('hidden');
            
            // Update UI
            document.getElementById('start-camera').classList.add('hidden');
            document.getElementById('stop-camera').classList.remove('hidden');
            
            // Start detection
            await video.play();
            this.startRealTimeDetection();
            
            console.log('✅ Webcam started successfully');
            
        } catch (error) {
            console.error('Failed to start webcam:', error);
            alert('Failed to access camera. Please check permissions.');
        }
    }
    
    stopWebcam() {
        console.log('🛑 Stopping webcam...');
        
        // Stop detection
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        // Stop media stream
        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }
        
        // Reset UI
        const video = document.getElementById('webcam-video');
        const placeholder = document.getElementById('camera-placeholder');
        const overlay = document.getElementById('detection-overlay');
        
        video.style.display = 'none';
        placeholder.style.display = 'flex';
        overlay.classList.add('hidden');
        
        document.getElementById('start-camera').classList.remove('hidden');
        document.getElementById('stop-camera').classList.add('hidden');
        
        console.log('✅ Webcam stopped');
    }
    
    startRealTimeDetection() {
        const video = document.getElementById('webcam-video');
        const canvas = document.getElementById('webcam-canvas');
        const ctx = canvas.getContext('2d');
        
        // Detection frequency (process every N frames)
        let frameCount = 0;
        const frequency = parseInt(document.getElementById('frequency-select').value);
        
        this.detectionInterval = setInterval(async () => {
            if (this.isProcessing) return;
            
            frameCount++;
            if (frameCount % frequency !== 0) return;
            
            try {
                this.isProcessing = true;
                
                // Capture frame
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = canvas.toDataURL('image/jpeg', 0.8);
                
                // Send for detection
                const startTime = Date.now();
                const result = await this.detectRealTime(imageData);
                const processingTime = Date.now() - startTime;
                
                // Update statistics
                this.updateStatistics(result, processingTime);
                
                // Update overlay
                this.updateDetectionOverlay(result);
                
            } catch (error) {
                console.error('Detection error:', error);
            } finally {
                this.isProcessing = false;
            }
        }, 100); // Check every 100ms
    }
    
    async detectRealTime(imageData) {
        const response = await fetch(`${this.apiBaseUrl}/detect-realtime`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.result;
    }
    
    updateDetectionOverlay(result) {
        const status = document.getElementById('detection-status');
        const confidence = document.getElementById('detection-confidence');
        const time = document.getElementById('detection-time');
        const overlay = document.getElementById('detection-overlay');
        
        if (result.is_deepfake) {
            overlay.className = 'detection-overlay bg-red-600 bg-opacity-80 text-white p-3 rounded-lg';
            status.textContent = '🚨 DEEPFAKE DETECTED';
        } else {
            overlay.className = 'detection-overlay bg-green-600 bg-opacity-80 text-white p-3 rounded-lg';
            status.textContent = '✅ AUTHENTIC';
        }
        
        confidence.textContent = `Confidence: ${(result.confidence * 100).toFixed(1)}%`;
        time.textContent = `${result.processing_time_ms || 0}ms`;
    }
    
    updateStatistics(result, clientProcessingTime) {
        this.statistics.framesProcessed++;
        this.statistics.totalProcessingTime += clientProcessingTime;
        
        if (result.is_deepfake) {
            this.statistics.detectionCount++;
        }
        
        // Update UI
        document.getElementById('frames-processed').textContent = this.statistics.framesProcessed;
        document.getElementById('avg-processing-time').textContent = 
            `${Math.round(this.statistics.totalProcessingTime / this.statistics.framesProcessed)}ms`;
        document.getElementById('detection-rate').textContent = 
            `${((this.statistics.detectionCount / this.statistics.framesProcessed) * 100).toFixed(1)}%`;
        document.getElementById('current-fps').textContent = 
            `${Math.round(1000 / (this.statistics.totalProcessingTime / this.statistics.framesProcessed))}`;
    }
    
    async updateSettings(settings) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/configure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    process_every_n_frames: settings.frequency || 3
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update settings');
            }
            
            console.log('✅ Settings updated:', settings);
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    }
    
    async handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('📹 Uploading video for analysis...');
        
        // Show progress
        const progressDiv = document.getElementById('upload-progress');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const resultsDiv = document.getElementById('video-results');
        
        progressDiv.classList.remove('hidden');
        resultsDiv.classList.add('hidden');
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            // Simulate upload progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress > 90) progress = 90;
                
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `Uploading... ${Math.round(progress)}%`;
            }, 500);
            
            const response = await fetch(`${this.apiBaseUrl}/detect-video`, {
                method: 'POST',
                body: formData
            });
            
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressText.textContent = 'Processing complete!';
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.displayVideoResults(data.result);
            
        } catch (error) {
            console.error('Video upload failed:', error);
            progressText.textContent = 'Upload failed. Please try again.';
        }
    }
    
    displayVideoResults(result) {
        const resultsDiv = document.getElementById('video-results');
        const progressDiv = document.getElementById('upload-progress');
        
        // Hide progress, show results
        progressDiv.classList.add('hidden');
        resultsDiv.classList.remove('hidden');
        
        // Update result cards
        document.getElementById('result-confidence').textContent = `${(result.confidence * 100).toFixed(1)}%`;
        document.getElementById('result-frames').textContent = result.frames_analyzed.toLocaleString();
        document.getElementById('result-percentage').textContent = `${result.deepfake_percentage}%`;
        document.getElementById('result-time').textContent = `${result.avg_processing_time_ms}ms`;
        
        // Final verdict
        const verdictDiv = document.getElementById('final-verdict');
        if (result.is_deepfake) {
            verdictDiv.className = 'p-4 rounded-lg text-center bg-red-100 border border-red-300';
            verdictDiv.innerHTML = `
                <div class="text-2xl font-bold text-red-800 mb-2">🚨 DEEPFAKE DETECTED</div>
                <div class="text-red-700">This video appears to contain deepfake content</div>
                <div class="text-sm text-red-600 mt-2">${result.deepfake_percentage}% of analyzed frames showed signs of manipulation</div>
            `;
        } else {
            verdictDiv.className = 'p-4 rounded-lg text-center bg-green-100 border border-green-300';
            verdictDiv.innerHTML = `
                <div class="text-2xl font-bold text-green-800 mb-2">✅ AUTHENTIC VIDEO</div>
                <div class="text-green-700">This video appears to be authentic</div>
                <div class="text-sm text-green-600 mt-2">No significant signs of deepfake manipulation detected</div>
            `;
        }
        
        console.log('✅ Video analysis complete:', result);
    }
    
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        console.log('🖼️ Uploading image for analysis...');
        
        // Show preview
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const resultsDiv = document.getElementById('image-results');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch(`${this.apiBaseUrl}/detect-image`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.displayImageResults(data.result);
            
        } catch (error) {
            console.error('Image upload failed:', error);
            alert('Image analysis failed. Please try again.');
        }
    }
    
    displayImageResults(result) {
        const resultsDiv = document.getElementById('image-results');
        resultsDiv.classList.remove('hidden');
        
        // Update result values
        document.getElementById('image-confidence').textContent = `${(result.confidence * 100).toFixed(1)}%`;
        document.getElementById('image-time').textContent = `${result.processing_time_ms}ms`;
        
        // Verdict
        const verdictDiv = document.getElementById('image-verdict');
        if (result.is_deepfake) {
            verdictDiv.className = 'p-4 rounded-lg text-center bg-red-100 border border-red-300';
            verdictDiv.innerHTML = `
                <div class="text-xl font-bold text-red-800 mb-2">🚨 DEEPFAKE DETECTED</div>
                <div class="text-red-700">This image appears to be manipulated</div>
            `;
        } else {
            verdictDiv.className = 'p-4 rounded-lg text-center bg-green-100 border border-green-300';
            verdictDiv.innerHTML = `
                <div class="text-xl font-bold text-green-800 mb-2">✅ AUTHENTIC IMAGE</div>
                <div class="text-green-700">This image appears to be authentic</div>
            `;
        }
        
        console.log('✅ Image analysis complete:', result);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeepfakeDetectorApp();
});

// Utility functions
function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatNumber(num) {
    return num.toLocaleString();
}

// Service worker for caching (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered:', registration))
            .catch(error => console.log('SW registration failed:', error));
    });
}