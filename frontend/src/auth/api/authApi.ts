import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse, AuthTokens, OtpChannel } from '../../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach access token
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 / token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          })
          .catch(Promise.reject);
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        window.location.href = '/signin';
        return Promise.reject(error);
      }
      try {
        const { data } = await axios.post<AuthTokens>(`${BASE_URL}/v1/auth/refresh-tokens`, { refreshToken });
        localStorage.setItem('access_token', data.access.token);
        localStorage.setItem('refresh_token', data.refresh.token);
        processQueue(null, data.access.token);
        original.headers.Authorization = `Bearer ${data.access.token}`;
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (login: string, password: string) =>
    client.post<AuthResponse>('/v1/auth/login', { login, password }),

  logout: (refreshToken: string) =>
    client.post('/v1/auth/logout', { refreshToken }),

  refreshTokens: (refreshToken: string) =>
    client.post<AuthTokens>('/v1/auth/refresh-tokens', { refreshToken }),

  forgotPassword: (email: string) =>
    client.post('/v1/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    client.post('/v1/auth/reset-password', { password }, { params: { token } }),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.post('/v1/auth/change-password', { currentPassword, newPassword }),

  getMe: () =>
    client.get('/v1/auth/me'),

  validateCredentials: (login: string, password: string) =>
    client.post<{
      status: boolean;
      channels?: OtpChannel[];
      must_change_password?: boolean;
      message: string;
    }>('/v1/auth/validate-credentials', { login, password }),

  // channel now accepts both 'email' and 'sms'
  sendOtp: (login: string, channel: 'email' | 'sms') =>
    client.post<{
      status: boolean;
      maskedContact: string;
      channel: 'email' | 'sms';
      message: string;
    }>('/v1/auth/send-otp', { login, channel }),

  verifyOtp: (login: string, otp: string) =>
    client.post<AuthResponse>('/v1/auth/verify-otp', { login, otp }),
};

export default client;
