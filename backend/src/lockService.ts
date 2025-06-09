import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.connect().catch(console.error);

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
  private LOCK_RENEWAL_THRESHOLD = 2 * 60 * 1000; // 2 minutes

  async getLockStatus(appointmentId: string): Promise<AppointmentLock | null> {
    try {
      // First check Redis for faster lookup
      const redisLock = await redis.get(`lock:${appointmentId}`);
      
      const lock = await prisma.appointmentLock.findUnique({
        where: { appointmentId },
        include: { user: true }
      });

      if (!lock) {
        // Clean up Redis if DB lock doesn't exist
        if (redisLock) {
          await redis.del(`lock:${appointmentId}`);
        }
        return null;
      }

      // Check if lock has expired
      if (new Date() > lock.expiresAt) {
        await this.forceReleaseLock(appointmentId);
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
    } catch (error) {
      console.error('Error getting lock status:', error);
      throw new Error('Failed to get lock status');
    }
  }

  async acquireLock(appointmentId: string, userId: string, userInfo: UserInfo): Promise<AppointmentLock> {
    const lockKey = `lock:${appointmentId}`;
    const acquireKey = `acquire:${appointmentId}`;
    
    try {
      // Use Redis for atomic lock acquisition to prevent race conditions
      const acquired = await redis.set(acquireKey, userId, {
        PX: 10000, // 10 second expiration for acquisition lock
        NX: true   // Only set if not exists
      });

      if (!acquired) {
        throw new Error('Another user is currently acquiring this lock');
      }

      try {
        // Check for existing lock within transaction
        const existingLock = await this.getLockStatus(appointmentId);

        if (existingLock && existingLock.userId !== userId) {
          throw new Error(`Appointment is locked by ${existingLock.userInfo.name}`);
        }

        const expiresAt = new Date(Date.now() + this.LOCK_DURATION);

        // Use database transaction for atomicity
        const lock = await prisma.$transaction(async (tx) => {
          return await tx.appointmentLock.upsert({
            where: { appointmentId },
            update: { 
              expiresAt,
              userId // Ensure user can renew their own lock
            },
            create: {
              appointmentId,
              userId,
              expiresAt
            },
            include: { user: true }
          });
        });

        // Set Redis lock for fast lookups and auto-cleanup
        await redis.setEx(lockKey, Math.floor(this.LOCK_DURATION / 1000), userId);

        return {
          appointmentId: lock.appointmentId,
          userId: lock.userId,
          userInfo,
          expiresAt: lock.expiresAt
        };
      } finally {
        // Always release the acquisition lock
        await redis.del(acquireKey);
      }
    } catch (error) {
      await redis.del(acquireKey); // Cleanup on error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to acquire lock');
    }
  }

  async releaseLock(appointmentId: string, userId: string): Promise<void> {
    try {
      const lock = await prisma.appointmentLock.findUnique({
        where: { appointmentId }
      });

      if (!lock) {
        throw new Error('No lock found for this appointment');
      }

      if (lock.userId !== userId) {
        throw new Error('You can only release your own locks');
      }

      await prisma.$transaction(async (tx) => {
        await tx.appointmentLock.delete({
          where: { appointmentId }
        });
      });

      await redis.del(`lock:${appointmentId}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to release lock');
    }
  }

  async forceReleaseLock(appointmentId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.appointmentLock.deleteMany({
          where: { appointmentId }
        });
      });

      await redis.del(`lock:${appointmentId}`);
    } catch (error) {
      console.error('Error force releasing lock:', error);
      throw new Error('Failed to force release lock');
    }
  }

  async renewLock(appointmentId: string, userId: string): Promise<void> {
    try {
      const lock = await prisma.appointmentLock.findUnique({
        where: { appointmentId }
      });

      if (!lock || lock.userId !== userId) {
        throw new Error('Cannot renew lock - not owner or lock not found');
      }

      // Only allow renewal if lock is within renewal threshold
      const timeUntilExpiry = lock.expiresAt.getTime() - Date.now();
      if (timeUntilExpiry > this.LOCK_RENEWAL_THRESHOLD) {
        throw new Error('Lock renewal not yet allowed');
      }

      const expiresAt = new Date(Date.now() + this.LOCK_DURATION);

      await prisma.$transaction(async (tx) => {
        await tx.appointmentLock.update({
          where: { appointmentId },
          data: { expiresAt }
        });
      });

      await redis.setEx(`lock:${appointmentId}`, Math.floor(this.LOCK_DURATION / 1000), userId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to renew lock');
    }
  }

  async cleanupExpiredLocks(): Promise<void> {
    try {
      const expiredLocks = await prisma.appointmentLock.findMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      for (const lock of expiredLocks) {
        await this.forceReleaseLock(lock.appointmentId);
      }
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }

  async releaseUserLocks(userId: string): Promise<void> {
    try {
      const userLocks = await prisma.appointmentLock.findMany({
        where: { userId }
      });

      for (const lock of userLocks) {
        await this.forceReleaseLock(lock.appointmentId);
      }
    } catch (error) {
      console.error('Error releasing user locks:', error);
    }
  }
}

export const lockService = new LockService();

// Cleanup expired locks every minute
setInterval(() => {
  lockService.cleanupExpiredLocks();
}, 60000);