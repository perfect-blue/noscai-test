export interface LockStatus {
  isLocked: boolean;
  isOwner: boolean;
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

export interface AppointmentLock {
  appointmentId: string;
  userId: string;
  userInfo: {
    name: string;
    email: string;
  };
  expiresAt: Date;
}