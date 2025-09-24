import React, { useState } from 'react';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    confidenceThreshold: 0.85,
    detectionInterval: 1000,
    enableAudio: true,
    modelType: 'standard'
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="settings">
      <h2>Detection Settings</h2>
      
      <div className="settings-grid">
        <div className="setting-item">
          <label>Confidence Threshold</label>
          <div className="slider-container">
            <input 
              type="range" 
              min="0.5" 
              max="1.0" 
              step="0.05" 
              value={settings.confidenceThreshold}
              onChange={(e) => handleSettingChange('confidenceThreshold', parseFloat(e.target.value))}
            />
            <span>{(settings.confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="setting-item">
          <label>Detection Interval (ms)</label>
          <select 
            value={settings.detectionInterval}
            onChange={(e) => handleSettingChange('detectionInterval', parseInt(e.target.value))}
          >
            <option value={500}>500ms (Fast)</option>
            <option value={1000}>1000ms (Standard)</option>
            <option value={2000}>2000ms (Slow)</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Model Type</label>
          <select 
            value={settings.modelType}
            onChange={(e) => handleSettingChange('modelType', e.target.value)}
          >
            <option value="standard">Standard Detection</option>
            <option value="enhanced">Enhanced Accuracy</option>
            <option value="fast">Fast Processing</option>
          </select>
        </div>

        <div className="setting-item">
          <label>
            <input 
              type="checkbox" 
              checked={settings.enableAudio}
              onChange={(e) => handleSettingChange('enableAudio', e.target.checked)}
            />
            Enable Audio Alerts
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn btn-save">Save Settings</button>
        <button className="btn btn-reset">Reset to Defaults</button>
      </div>

      <div className="settings-info">
        <h3>About the Settings</h3>
        <ul>
          <li><strong>Confidence Threshold:</strong> Higher values reduce false positives but may miss some deepfakes</li>
          <li><strong>Detection Interval:</strong> How often frames are analyzed (shorter intervals use more CPU)</li>
          <li><strong>Model Type:</strong> Choose between speed and accuracy based on your needs</li>
        </ul>
      </div>
    </div>
  );
};

export default Settings;