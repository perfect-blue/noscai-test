import axios from 'axios';
import { AppointmentLock, Appointment } from '@/types/appointment';

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

  // Appointment CRUD (mock for now)
  getAppointment: async (id: string): Promise<Appointment> => {
    // Mock data - replace with actual API call
    return {
      id,
      title: 'Sample Appointment',
      description: 'This is a sample appointment for testing the locking system',
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  updateAppointment: async (id: string, data: Partial<Appointment>): Promise<Appointment> => {
    // Mock implementation - replace with actual API call
    const appointment = await appointmentApi.getAppointment(id);
    return { ...appointment, ...data, updatedAt: new Date() };
  },
};

export default api;