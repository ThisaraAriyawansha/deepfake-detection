// Popup script for the extension
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusDiv = document.getElementById('status');
    const detectionList = document.getElementById('detectionList');
    
    let isDetectionActive = false;
    let detectionHistory = [];

    // Load saved state
    chrome.storage.local.get(['isActive', 'detectionHistory'], function(result) {
        isDetectionActive = result.isActive || false;
        detectionHistory = result.detectionHistory || [];
        updateUI();
    });

    // Toggle detection
    toggleBtn.addEventListener('click', function() {
        isDetectionActive = !isDetectionActive;
        
        // Send message to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'toggleDetection',
                enabled: isDetectionActive
            });
        });

        // Save state
        chrome.storage.local.set({isActive: isDetectionActive});
        updateUI();
    });

    // Listen for detection results from content script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'detectionResult') {
            addDetectionResult(request.result);
        }
    });

    function updateUI() {
        if (isDetectionActive) {
            statusDiv.textContent = 'Detection: ACTIVE';
            statusDiv.className = 'status status-active';
            toggleBtn.textContent = 'Disable Detection';
            toggleBtn.className = 'toggle-btn btn-disable';
        } else {
            statusDiv.textContent = 'Detection: INACTIVE';
            statusDiv.className = 'status status-inactive';
            toggleBtn.textContent = 'Enable Detection';
            toggleBtn.className = 'toggle-btn btn-enable';
        }
        
        updateDetectionList();
    }

    function addDetectionResult(result) {
        const detection = {
            timestamp: new Date().toLocaleTimeString(),
            isDeepfake: result.deepfake_detected,
            confidence: result.confidence,
            faces: result.faces_detected
        };
        
        detectionHistory.unshift(detection);
        if (detectionHistory.length > 5) {
            detectionHistory = detectionHistory.slice(0, 5);
        }
        
        chrome.storage.local.set({detectionHistory: detectionHistory});
        updateDetectionList();
    }

    function updateDetectionList() {
        if (detectionHistory.length === 0) {
            detectionList.innerHTML = '<div class="result-item">No detections yet</div>';
            return;
        }
        
        detectionList.innerHTML = detectionHistory.map(detection => `
            <div class="result-item">
                <strong>${detection.timestamp}</strong><br>
                Status: <span class="${detection.isDeepfake ? 'fake' : 'real'}">
                    ${detection.isDeepfake ? '🚨 FAKE' : '✅ REAL'}
                </span><br>
                Confidence: ${(detection.confidence * 100).toFixed(1)}%<br>
                Faces: ${detection.faces}
            </div>
        `).join('');
    }

    // Request current status from content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, function(response) {
            if (response && response.isActive !== undefined) {
                isDetectionActive = response.isActive;
                updateUI();
            }
        });
    });
});