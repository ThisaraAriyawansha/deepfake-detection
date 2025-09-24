import axios from 'axios';

// Use the environment variable or default to localhost:5000
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

console.log('API Base URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const deepfakeAPI = {
  // Health check
  healthCheck: () => api.get('/api/health'),
  
  // Image detection
  detectImage: (imageData, returnImage = false) => 
    api.post('/api/detect/image', {
      image: imageData,
      return_image: returnImage
    }),
  
  // Video detection
  detectVideo: (videoFile) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    return api.post('/api/detect/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};