export interface LockStatus {
  isLocked: boolean;
  isOwner: boolean;
  canEdit: boolean;
  appointmentId: string;
  lockedBy?: {
    id: string;
    name: string;
    email: string;
  };
  expiresAt?: string;
}

export interface CursorUpdate {
  appointmentId: string;
  userId: string;
  userInfo: {
    name: string;
    email: string;
  };
  x: number;
  y: number;
  timestamp: number;
}

// Make sure LockStatus can be null in contexts where it's loading
export interface AppointmentLock {
  lockStatus: LockStatus | null;
  appointmentId: string;
  userId: string;
  userInfo: {
    name: string;
    email: string;
  };
  expiresAt: Date;
}

export interface Appointment {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  patientName?: string;
  doctorId?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'doctor' | 'user';
}