import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Update with your backend URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Example API calls
export const getPersons = () => api.get('/persons/');
export const createPerson = (data) => api.post('/persons/', data);
export const updatePerson = (id, data) => api.put(`/persons/${id}/`, data);
export const deletePerson = (id) => api.delete(`/persons/${id}/`);
export const recognizeFace = (data) => api.post('/recognition/identify', data);
export const getRecognitionLogs = () => api.get('/recognition/logs/');
export const getDashboardStats = () => api.get('/dashboard/stats/');

export default api;