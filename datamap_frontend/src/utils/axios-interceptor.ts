import axios from 'axios';
import { API_BASE_URL } from '../config/env';
import { getAuthToken, getUserIdentity } from './userIdentity';

// Create axios instance for upload API (port 8000)
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach the per-user identity so the backend scopes
// sessions/uploads/profiling to the actual user (no hardcoded default user).
axiosInstance.interceptors.request.use(
  (config) => {
    // Primary auth: the Launchpad SSO JWT (validated server-side).
    const token = getAuthToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    // Also send the SSO-derived identity headers so the backend scopes data to
    // the user in either auth mode (launchpad_sso reads the bearer; dev reads these).
    const { userId, userEmail } = getUserIdentity();
    if (userId) config.headers.set('x-dev-user-id', userId);
    if (userEmail) config.headers.set('x-dev-user-email', userEmail);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for upload API
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.data?.detail) {
      const enhancedError = new Error(error.response.data.detail);
      enhancedError.name = 'APIError';
      return Promise.reject(enhancedError);
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
