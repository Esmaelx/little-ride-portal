import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If token expired and we haven't retried yet
        if (error.response?.status === 401 &&
            error.response?.data?.code === 'TOKEN_EXPIRED' &&
            !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken
                });

                const { accessToken } = response.data.data;
                localStorage.setItem('accessToken', accessToken);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                // Refresh failed, redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    changePassword: (data) => api.put('/auth/password', data)
};

// Drivers API
export const driversAPI = {
    getAll: (params) => api.get('/drivers', { params }),
    getStats: (params) => api.get('/drivers/stats', { params }),
    getById: (id) => api.get(`/drivers/${id}`),
    create: (data) => api.post('/drivers', data),
    update: (id, data) => api.put(`/drivers/${id}`, data),
    updateStatus: (id, data) => api.put(`/drivers/${id}/status`, data)
};

// Documents API
export const documentsAPI = {
    getQueue: (params) => api.get('/documents/queue', { params }),
    upload: (driverId, formData) => api.post(`/documents/${driverId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getFile: (id) => api.get(`/documents/${id}/file`, { responseType: 'blob' }),
    updateStatus: (id, data) => api.put(`/documents/${id}/status`, data),
    delete: (id) => api.delete(`/documents/${id}`)
};

// Users API
export const usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
    delete: (id) => api.delete(`/users/${id}`)
};

// Audit API
export const auditAPI = {
    getAll: (params) => api.get('/audit', { params }),
    getStats: (params) => api.get('/audit/stats', { params }),
    getByEntity: (type, id) => api.get(`/audit/entity/${type}/${id}`)
};

export default api;
