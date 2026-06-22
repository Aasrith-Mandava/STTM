// Environment configuration helper
export const API_BASE_URL =
  import.meta.env.VITE_REACT_API_BASE_URL || "http://127.0.0.1:8001";
export const PROJECT_ID = import.meta.env.VITE_PROJECT_ID;

export const config = {
  apiBaseUrl: API_BASE_URL,
  projectId: import.meta.env.VITE_PROJECT_ID,
  environment: import.meta.env.VITE_ENV,
  isDevelopment: import.meta.env.VITE_ENV === 'local' || import.meta.env.VITE_ENV === 'development',
  isProduction: import.meta.env.VITE_ENV === 'production',
  debug: import.meta.env.VITE_DEBUG === 'true',
} as const;

export default config;