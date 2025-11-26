/**
 * API Service
 * Axios instance and API methods for backend communication
 */

import axios from 'axios';

/**
 * Base API URL from environment variable
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Create axios instance for authenticated requests
 */
export const authAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Create axios instance for public requests
 */
export const publicAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth token
 */
authAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors
 */
authAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Auth API methods
 */
export const authService = {
  login: (email: string, password: string) =>
    publicAPI.post('/auth/login', { email, password }),
  register: (data: any) =>
    publicAPI.post('/auth/register', data),
  getProfile: () =>
    authAPI.get('/auth/profile'),
};

/**
 * Medicine API methods
 */
export const medicineService = {
  getAll: (params?: any) =>
    authAPI.get('/medicines', { params }),
  getById: (id: string) =>
    authAPI.get(`/medicines/${id}`),
  create: (data: any) =>
    authAPI.post('/medicines', data),
  update: (id: string, data: any) =>
    authAPI.put(`/medicines/${id}`, data),
  delete: (id: string) =>
    authAPI.delete(`/medicines/${id}`),
  getExpiryAlerts: (params?: any) =>
    authAPI.get('/medicines/expiry-alerts', { params }),
};

/**
 * Prescription API methods
 */
export const prescriptionService = {
  getAll: (params?: any) =>
    authAPI.get('/prescriptions', { params }),
  getById: (id: string) =>
    authAPI.get(`/prescriptions/${id}`),
  create: (data: any) =>
    authAPI.post('/prescriptions', data),
  validate: (id: string, notes?: string) =>
    authAPI.post(`/prescriptions/${id}/validate`, { notes }),
  dispense: (id: string) =>
    authAPI.post(`/prescriptions/${id}/dispense`),
};

/**
 * Reorder API methods
 */
export const reorderService = {
  getAll: (params?: any) =>
    authAPI.get('/reorders', { params }),
  getPending: () =>
    authAPI.get('/reorders/pending'),
  approve: (id: string) =>
    authAPI.post(`/reorders/${id}/approve`),
  markAsOrdered: (id: string) =>
    authAPI.post(`/reorders/${id}/order`),
  markAsReceived: (id: string, receivedQuantity?: number) =>
    authAPI.post(`/reorders/${id}/receive`, { receivedQuantity }),
};

/**
 * Analytics API methods
 */
export const analyticsService = {
  getDemandTrends: (medicineId: string, days?: number) =>
    authAPI.get('/analytics/demand-trends', { params: { medicineId, days } }),
  getInventoryAnalytics: (days?: number) =>
    authAPI.get('/analytics/inventory', { params: { days } }),
  getReorderRecommendations: (days?: number) =>
    authAPI.get('/analytics/reorder-recommendations', { params: { days } }),
};

/**
 * Chatbot API methods
 */
export const chatbotService = {
  chat: (query: string) =>
    authAPI.post('/chatbot/chat', { query }),
};

