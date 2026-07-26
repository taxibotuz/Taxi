import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  telegramLogin: (data: any) => api.post('/auth/telegram', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  becomeDriver: (data: any) => api.post('/auth/become-driver', data),
  verifyToken: () => api.get('/auth/verify'),
};

export const ridesApi = {
  createOrder: (data: any) => api.post('/rides', data),
  getOrders: (params?: any) => api.get('/rides', { params }),
  getOrderById: (id: string) => api.get(`/rides/${id}`),
  cancelOrder: (id: string, reason?: string) => api.post(`/rides/${id}/cancel`, { reason }),
  updateStatus: (id: string, status: string) => api.put(`/rides/${id}/status`, { status }),
  estimatePrice: (data: any) => api.get('/rides/estimate', { params: data }),
};

export const driversApi = {
  getDashboard: () => api.get('/drivers/dashboard'),
  toggleOnline: () => api.post('/drivers/toggle-online'),
  updateLocation: (data: any) => api.post('/drivers/location', data),
  getHistory: (params?: any) => api.get('/drivers/history', { params }),
  getWallet: () => api.get('/drivers/wallet'),
};

export const walletApi = {
  getBalance: () => api.get('/wallet'),
  getTransactions: (params?: any) => api.get('/wallet/transactions', { params }),
  topUp: (data: any) => api.post('/wallet/topup', data),
};

export const reviewsApi = {
  createReview: (data: any) => api.post('/reviews', data),
  getReviews: (userId: string) => api.get(`/reviews/${userId}`),
};

export const promoCodesApi = {
  validate: (code: string) => api.get(`/promocodes/validate/${code}`),
  create: (data: any) => api.post('/promocodes', data),
  getAll: (params?: any) => api.get('/promocodes', { params }),
};

export const notificationsApi = {
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getDrivers: (params?: any) => api.get('/admin/drivers', { params }),
  updateDriver: (id: string, data: any) => api.put(`/admin/drivers/${id}`, data),
  getOrders: (params?: any) => api.get('/admin/orders', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  assignAdmin: (telegramId: number) => api.post('/admin/assign-admin', { telegramId }),
  banUser: (userId: string, reason?: string) => api.post(`/admin/ban/${userId}`, { reason }),
  unbanUser: (userId: string) => api.post(`/admin/unban/${userId}`),
  getDriversLocations: () => api.get('/admin/drivers-locations'),
  getRevenue: (params?: any) => api.get('/admin/revenue', { params }),
  getLogs: (params?: any) => api.get('/admin/logs', { params }),
};

export const foodApi = {
  getRestaurants: (params?: any) => api.get('/food/restaurants', { params }),
  getRestaurantById: (id: string) => api.get(`/food/restaurants/${id}`),
  getCategories: (params?: any) => api.get('/food/categories', { params }),
  getProducts: (restaurantId: string, categoryId: string) =>
    api.get(`/food/restaurants/${restaurantId}/categories/${categoryId}/products`),
};

export default api;
