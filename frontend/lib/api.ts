import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Token management functions
export const getAccessToken = (): string | undefined => {
  return Cookies.get(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | undefined => {
  return Cookies.get(REFRESH_TOKEN_KEY);
};

export const setTokens = (accessToken: string, refreshToken: string) => {
  // Access token expires in 15 minutes
  Cookies.set(ACCESS_TOKEN_KEY, accessToken, { expires: 1/96 }); // 15 minutes
  // Refresh token expires in 7 days
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, { expires: 7 });
};

export const clearTokens = () => {
  Cookies.remove(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
      
      try {
        // Attempt to refresh the token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token, refresh_token } = response.data;
        setTokens(access_token, refresh_token);
        
        // Retry all queued requests
        processQueue(null, access_token);
        
        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle other errors
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (error.response?.status === 404) {
      // Don't show toast for 404s, handle in component
    } else if (error.response?.status === 500) {
      toast.error('An unexpected error occurred. Please try again.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timed out. Please try again.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// API methods
export default api;

// Auth endpoints
export const auth = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = response.data;
    setTokens(access_token, refresh_token);
    return response.data;
  },
  
  register: async (data: { username: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', data);
    const { access_token, refresh_token } = response.data;
    setTokens(access_token, refresh_token);
    return response.data;
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },
  
  refresh: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');
    
    const response = await api.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    const { access_token, refresh_token } = response.data;
    setTokens(access_token, refresh_token);
    return response.data;
  },
};

// User endpoints
export const users = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/users/password', data),
  deleteAccount: () => api.delete('/users/account'),
};

// League endpoints
export const leagues = {
  connect: (data: any) => api.post('/leagues', data),
  list: () => api.get('/leagues'),
  get: (id: string) => api.get(`/leagues/${id}`),
  sync: (id: string) => api.post(`/leagues/${id}/sync`),
  delete: (id: string) => api.delete(`/leagues/${id}`),
  getRosters: (id: string) => api.get(`/leagues/${id}/rosters`),
  getAvailablePlayers: (id: string, params?: any) =>
    api.get(`/leagues/${id}/available-players`, { params }),
  getMatchups: (id: string, week?: number) =>
    api.get(`/leagues/${id}/matchups`, { params: { week } }),
};

// Player endpoints
export const players = {
  list: (params?: any) => api.get('/players', { params }),
  get: (id: string) => api.get(`/players/${id}`),
  getStats: (id: string, params?: any) => api.get(`/players/${id}/stats`, { params }),
  getMetrics: (id: string, params?: any) => api.get(`/players/${id}/metrics`, { params }),
  search: (query: string) => api.get('/players/search', { params: { q: query } }),
};

// Draft endpoints
export const draft = {
  createSession: (data: any) => api.post('/draft/sessions', data),
  listSessions: () => api.get('/draft/sessions'),
  getSession: (id: string) => api.get(`/draft/sessions/${id}`),
  recordPick: (sessionId: string, data: any) =>
    api.post(`/draft/sessions/${sessionId}/pick`, data),
  undoPick: (sessionId: string) => api.post(`/draft/sessions/${sessionId}/undo`),
  redoPick: (sessionId: string) => api.post(`/draft/sessions/${sessionId}/redo`),
  pauseSession: (sessionId: string) => api.post(`/draft/sessions/${sessionId}/pause`),
  resumeSession: (sessionId: string) => api.post(`/draft/sessions/${sessionId}/resume`),
  getRecommendations: (sessionId: string) =>
    api.get(`/draft/sessions/${sessionId}/recommendations`),
};