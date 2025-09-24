import React, { useState } from 'react';
import VideoDetector from './components/VideoDetector';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('detector');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'settings':
        return <Settings />;
      default:
        return <VideoDetector />;
    }
  };

  return (
    <div className="App">
      <nav className="app-nav">
        <div className="nav-brand">
          <h2>🚨 Deepfake Detector</h2>
        </div>
        <div className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'detector' ? 'active' : ''}`}
            onClick={() => setActiveTab('detector')}
          >
            🎥 Real-Time Detection
          </button>
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Analytics Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      </nav>

      <main className="app-main">
        {renderContent()}
      </main>

      <footer className="app-footer">
        <p>Deepfake Detection System v1.0 | Real-time AI-powered content authentication</p>
      </footer>
    </div>
  );
}

export default App;