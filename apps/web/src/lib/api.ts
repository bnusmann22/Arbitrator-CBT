import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Unwraps the TransformInterceptor envelope `{ success, data, timestamp }`
 * if present, otherwise returns the value as-is.
 *
 * This lets the frontend work correctly whether the NestJS API has the
 * global TransformInterceptor active or not.
 */
function unwrapEnvelope<T>(body: unknown): T {
  if (
    body !== null &&
    typeof body === 'object' &&
    'success' in body &&
    'data' in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

// Request interceptor — JWT is sent automatically via httpOnly cookie
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

// Response interceptor — unwrap envelope + handle 401
api.interceptors.response.use(
  (response) => unwrapEnvelope(response.data),
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const isAdmin = window.location.pathname.startsWith('/admin') ||
                        window.location.pathname.startsWith('/dashboard');
        window.location.href = isAdmin ? '/admin/login' : '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default api;
