// extension/background.js
console.log('🔧 Deepfake Detector Background Script Loaded');

class BackgroundController {
    constructor() {
        this.detectionStats = {
            sessionsToday: 0,
            deepfakesDetected: 0,
            lastDetection: null
        };
        
        this.init();
    }
    
    init() {
        // Setup message listeners
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep channel open for async response
        });
        
        // Setup notification click listener
        chrome.notifications.onClicked.addListener((notificationId) => {
            if (notificationId === 'deepfake-alert') {
                chrome.tabs.create({ url: 'http://localhost:5000' });
            }
        });
        
        // Setup installation/update handlers
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstall(details);
        });
        
        console.log('✅ Background script initialized');
    }
    
    async handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'deepfakeDetected':
                await this.handleDeepfakeDetection(request.data, sender);
                sendResponse({ success: true });
                break;
                
            case 'openSettings':
                chrome.runtime.openOptionsPage();
                sendResponse({ success: true });
                break;
                
            case 'getStats':
                sendResponse({ stats: this.detectionStats });
                break;
                
            case 'updateStats':
                this.updateStats(request.data);
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ error: 'Unknown action' });
        }
    }
    
    async handleDeepfakeDetection(detectionData, sender) {
        console.log('🚨 Deepfake detected:', detectionData);
        
        // Update statistics
        this.detectionStats.deepfakesDetected++;
        this.detectionStats.lastDetection = new Date().toISOString();
        
        // Save stats
        await chrome.storage.local.set({ detectionStats: this.detectionStats });
        
        // Create notification
        await this.createNotification(detectionData, sender.tab);
        
        // Log to API if available
        this.logDetection(detectionData, sender.tab);
    }
    
    async createNotification(detectionData, tab) {
        try {
            await chrome.notifications.create('deepfake-alert', {
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: '🚨 Deepfake Detected!',
                message: `Confidence: ${(detectionData.confidence * 100).toFixed(1)}%\nSite: ${tab.url}`,
                buttons: [
                    { title: 'View Dashboard' },
                    { title: 'Dismiss' }
                ],
                requireInteraction: true
            });
        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    }
    
    async logDetection(detectionData, tab) {
        try {
            await fetch('http://localhost:5000/api/log-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    url: tab.url,
                    title: tab.title,
                    confidence: detectionData.confidence,
                    processingTime: detectionData.processing_time_ms
                })
            });
        } catch (error) {
            console.log('API logging failed (offline):', error.message);
        }
    }
    
    updateStats(data) {
        if (data.sessionStart) {
            this.detectionStats.sessionsToday++;
        }
        
        // Save updated stats
        chrome.storage.local.set({ detectionStats: this.detectionStats });
    }
    
    async handleInstall(details) {
        if (details.reason === 'install') {
            console.log('🎉 Extension installed');
            
            // Set default settings
            await chrome.storage.sync.set({
                deepfakeSettings: {
                    enabled: true,
                    showOverlays: true,
                    alertNotifications: true,
                    sensitivity: 0.5,
                    alertThreshold: 0.7
                }
            });
            
            // Open welcome page
            chrome.tabs.create({ url: 'http://localhost:5000' });
            
        } else if (details.reason === 'update') {
            console.log('🔄 Extension updated');
        }
    }
}

// Initialize background controller
new BackgroundController();