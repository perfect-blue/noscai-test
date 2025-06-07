import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();


const redis = createClient({
  url: 'redis://localhost:6379',
});

redis.connect();

interface UserInfo {
  name: string;
  email: string;
}

interface AppointmentLock {
  appointmentId: string;
  userId: string;
  userInfo: UserInfo;
  expiresAt: Date;
}

class LockService {
  private LOCK_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  async getLockStatus(appointmentId: string): Promise<AppointmentLock | null> {
    const lock = await prisma.appointmentLock.findUnique({
      where: { appointmentId },
      include: { user: true }
    });

    if (!lock) return null;

    // Check if lock has expired
    if (new Date() > lock.expiresAt) {
      await this.releaseLock(appointmentId, lock.userId);
      return null;
    }

    return {
      appointmentId: lock.appointmentId,
      userId: lock.userId,
      userInfo: {
        name: lock.user.name,
        email: lock.user.email
      },
      expiresAt: lock.expiresAt
    };
  }

  async acquireLock(appointmentId: string, userId: string, userInfo: UserInfo): Promise<AppointmentLock> {
    // Check for existing lock
    const existingLock = await this.getLockStatus(appointmentId);

    if (existingLock && existingLock.userId !== userId) {
      throw new Error(`Appointment is locked by ${existingLock.userInfo.name}`);
    }

    const expiresAt = new Date(Date.now() + this.LOCK_DURATION);

    const lock = await prisma.appointmentLock.upsert({
      where: { appointmentId },
      update: { expiresAt },
      create: {
        appointmentId,
        userId,
        expiresAt
      },
      include: { user: true }
    });

    // Set expiration in Redis for auto-cleanup
    await redis.setEx(`lock:${appointmentId}`, this.LOCK_DURATION / 1000, userId);

    return {
      appointmentId: lock.appointmentId,
      userId: lock.userId,
      userInfo,
      expiresAt: lock.expiresAt
    };
  }

  async releaseLock(appointmentId: string, userId: string): Promise<void> {
    const lock = await prisma.appointmentLock.findUnique({
      where: { appointmentId }
    });

    if (!lock) {
      throw new Error('No lock found for this appointment');
    }

    if (lock.userId !== userId) {
      throw new Error('You can only release your own locks');
    }

    await prisma.appointmentLock.delete({
      where: { appointmentId }
    });

    await redis.del(`lock:${appointmentId}`);
  }

  async forceReleaseLock(appointmentId: string): Promise<void> {
    await prisma.appointmentLock.delete({
      where: { appointmentId }
    });

    await redis.del(`lock:${appointmentId}`);
  }

  async renewLock(appointmentId: string, userId: string): Promise<void> {
    const lock = await prisma.appointmentLock.findUnique({
      where: { appointmentId }
    });

    if (!lock || lock.userId !== userId) {
      throw new Error('Cannot renew lock');
    }

    const expiresAt = new Date(Date.now() + this.LOCK_DURATION);

    await prisma.appointmentLock.update({
      where: { appointmentId },
      data: { expiresAt }
    });

    await redis.setEx(`lock:${appointmentId}`, this.LOCK_DURATION / 1000, userId);
  }
}

export const lockService = new LockService();