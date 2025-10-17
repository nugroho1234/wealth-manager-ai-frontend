import axios, { AxiosError, AxiosResponse } from 'axios';
import { AuthTokens, ApiError } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // Increased to 120 seconds for LLM extraction tasks (OpenAI has 90s timeout)
});

// Token management
let authTokens: AuthTokens | null = null;

export const setAuthTokens = (tokens: AuthTokens | null) => {
  authTokens = tokens;
  if (tokens) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`;
    // Store in localStorage for persistence
    localStorage.setItem('auth_tokens', JSON.stringify(tokens));
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('auth_tokens');
  }
};

export const getAuthTokens = (): AuthTokens | null => {
  if (authTokens) return authTokens;
  
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth_tokens');
    if (stored) {
      try {
        const tokens = JSON.parse(stored) as AuthTokens;
        
        // Check if token is expired (3-day sessions as per requirements)
        if (isTokenExpired(tokens.access_token)) {
          console.log('Stored token is expired, clearing tokens');
          localStorage.removeItem('auth_tokens');
          return null;
        }
        
        setAuthTokens(tokens);
        return tokens;
      } catch (error) {
        console.error('Failed to parse stored auth tokens:', error);
        localStorage.removeItem('auth_tokens');
      }
    }
  }
  return null;
};

// Helper function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    // Check if token is actually expired (no buffer to prevent premature expiration)
    // The backend issues 3-day tokens, so we should only expire when truly expired
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

export const clearAuthTokens = () => {
  setAuthTokens(null);
};

// Initialize tokens on startup
if (typeof window !== 'undefined') {
  getAuthTokens();
}

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('🌐 Making API request:', config.method?.toUpperCase(), config.url);
    console.log('🌐 Request data:', config.data);
    
    // Ensure we have the latest token
    const tokens = getAuthTokens();
    if (tokens) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
      console.debug('API request with token:', config.url, tokens.access_token.substring(0, 20) + '...');
    } else {
      console.warn('API request without token:', config.url);
    }
    
    // Don't set Content-Type for FormData uploads - let browser handle it
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.debug('Removed Content-Type for FormData upload');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ API response success:', response.config.url, response.status);
    console.debug('API response data:', response.data);
    return response;
  },
  (error: AxiosError) => {
    console.error('❌ API response error:', error);
    console.error('❌ Error config:', error.config);
    console.error('❌ Error response:', error.response);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    const apiError: ApiError = {
      detail: 'An unexpected error occurred',
      status_code: error.response?.status || 500,
    };

    if (error.response?.data && typeof error.response.data === 'object') {
      const responseData = error.response.data as any;
      if (responseData.detail) {
        apiError.detail = responseData.detail;
      }
      if (responseData.error_type) {
        apiError.error_type = responseData.error_type;
      }
    }

    // Handle 401 unauthorized - clear tokens and redirect to login
    if (error.response?.status === 401) {
      clearAuthTokens();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    console.error('❌ Transformed API error:', apiError);
    return Promise.reject(apiError);
  }
);

export default apiClient;