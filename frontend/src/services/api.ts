import axios from 'axios';
import { AppointmentLock, Appointment, User } from '@/types/appointment';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const appointmentApi = {
  // Lock management
  getLockStatus: async (appointmentId: string): Promise<AppointmentLock | null> => {
    const response = await api.get(`/appointments/${appointmentId}/lock-status`);
    return response.data;
  },

  acquireLock: async (appointmentId: string): Promise<AppointmentLock> => {
    const response = await api.post(`/appointments/${appointmentId}/acquire-lock`);
    return response.data;
  },

  releaseLock: async (appointmentId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/release-lock`);
  },

  forceReleaseLock: async (appointmentId: string): Promise<void> => {
    await api.delete(`/appointments/${appointmentId}/force-release-lock`);
  },

  renewLock: async (appointmentId: string): Promise<AppointmentLock> => {
    const response = await api.post(`/appointments/${appointmentId}/renew-lock`);
    return response.data;
  },

  // Appointment CRUD
  getAppointment: async (id: string): Promise<Appointment> => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  updateAppointment: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    const response = await api.put(`/appointments/${id}`, data);
    return response.data;
  },

  createAppointment: async (data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appointment> => {
    const response = await api.post('/appointments', data);
    return response.data;
  },

  deleteAppointment: async (id: string): Promise<void> => {
    await api.delete(`/appointments/${id}`);
  },

  listAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get('/appointments');
    return response.data;
  },
};

export default api;