import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './Dashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalDetections: 0,
    deepfakeDetections: 0,
    authenticDetections: 0,
    averageConfidence: 0
  });

  const [detectionHistory, setDetectionHistory] = useState([]);

  // Mock data for demonstration
  useEffect(() => {
    const mockHistory = Array.from({ length: 20 }, (_, i) => ({
      timestamp: new Date(Date.now() - (20 - i) * 30000).toLocaleTimeString(),
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      isDeepfake: Math.random() > 0.8 // 20% chance of deepfake
    }));

    setDetectionHistory(mockHistory);
    
    const deepfakeCount = mockHistory.filter(d => d.isDeepfake).length;
    setStats({
      totalDetections: mockHistory.length,
      deepfakeDetections: deepfakeCount,
      authenticDetections: mockHistory.length - deepfakeCount,
      averageConfidence: mockHistory.reduce((acc, curr) => acc + curr.confidence, 0) / mockHistory.length
    });
  }, []);

  const chartData = {
    labels: detectionHistory.map(d => d.timestamp),
    datasets: [
      {
        label: 'Confidence Score',
        data: detectionHistory.map(d => d.confidence),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
        pointBackgroundColor: detectionHistory.map(d => 
          d.isDeepfake ? 'rgb(255, 99, 132)' : 'rgb(75, 192, 192)'
        )
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Real-time Detection Confidence'
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context) {
            const index = context.dataIndex;
            return detectionHistory[index].isDeepfake ? '🚨 Deepfake' : '✅ Authentic';
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 1,
        title: {
          display: true,
          text: 'Confidence'
        }
      }
    }
  };

  return (
    <div className="dashboard">
      <h2>Detection Analytics Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalDetections}</div>
          <div className="stat-label">Total Detections</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value" style={{color: '#ff6b6b'}}>
            {stats.deepfakeDetections}
          </div>
          <div className="stat-label">Deepfake Detections</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value" style={{color: '#4ecdc4'}}>
            {stats.authenticDetections}
          </div>
          <div className="stat-label">Authentic Detections</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">
            {(stats.averageConfidence * 100).toFixed(1)}%
          </div>
          <div className="stat-label">Average Confidence</div>
        </div>
      </div>

      <div className="chart-container">
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="recent-detections">
        <h3>Recent Detections</h3>
        <div className="detections-list">
          {detectionHistory.slice(-10).reverse().map((detection, index) => (
            <div key={index} className="detection-item">
              <span className="detection-time">{detection.timestamp}</span>
              <span className={`detection-status ${detection.isDeepfake ? 'fake' : 'real'}`}>
                {detection.isDeepfake ? '🚨 DEEPFAKE' : '✅ AUTHENTIC'}
              </span>
              <span className="detection-confidence">
                {(detection.confidence * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;