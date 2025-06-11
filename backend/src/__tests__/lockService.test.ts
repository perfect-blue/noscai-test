import { lockService } from '../lockService';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('redis');

const mockPrisma = {
  appointmentLock: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn()
  },
  $transaction: jest.fn()
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined)
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
(createClient as jest.Mock).mockReturnValue(mockRedis);

describe('LockService', () => {
  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user'
  };

  const mockUserInfo = {
    name: mockUser.name,
    email: mockUser.email
  };

  const appointmentId = 'appt-001';

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  });

  describe('getLockStatus', () => {
    it('should return null when no lock exists', async () => {
      mockPrisma.appointmentLock.findUnique.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);

      const result = await lockService.getLockStatus(appointmentId);
      expect(result).toBeNull();
    });

    it('should return lock when valid lock exists', async () => {
      const mockLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 300000), // 5 minutes from now
        user: mockUser
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(mockLock);
      mockRedis.get.mockResolvedValue(mockUser.id);

      const result = await lockService.getLockStatus(appointmentId);
      expect(result).toEqual({
        appointmentId,
        userId: mockUser.id,
        userInfo: mockUserInfo,
        expiresAt: mockLock.expiresAt
      });
    });

    it('should clean up expired lock and return null', async () => {
      const expiredLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        user: mockUser
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(expiredLock);
      mockPrisma.appointmentLock.deleteMany.mockResolvedValue({ count: 1 });

      const result = await lockService.getLockStatus(appointmentId);
      expect(result).toBeNull();
      expect(mockPrisma.appointmentLock.deleteMany).toHaveBeenCalledWith({
        where: { appointmentId }
      });
      expect(mockRedis.del).toHaveBeenCalledWith(`lock:${appointmentId}`);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.appointmentLock.findUnique.mockRejectedValue(new Error('DB Error'));

      await expect(lockService.getLockStatus(appointmentId))
        .rejects.toThrow('Failed to get lock status');
    });
  });

  describe('acquireLock', () => {
    it('should successfully acquire lock when none exists', async () => {
      const expiresAt = new Date(Date.now() + 300000);
      const mockLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt,
        user: mockUser
      };

      mockRedis.set.mockResolvedValue('OK'); // Acquisition lock
      mockPrisma.appointmentLock.findUnique.mockResolvedValue(null);
      mockPrisma.appointmentLock.upsert.mockResolvedValue(mockLock);
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const result = await lockService.acquireLock(appointmentId, mockUser.id, mockUserInfo);

      expect(result).toEqual({
        appointmentId,
        userId: mockUser.id,
        userInfo: mockUserInfo,
        expiresAt
      });
      expect(mockRedis.set).toHaveBeenCalledWith(
        `acquire:${appointmentId}`,
        mockUser.id,
        { PX: 10000, NX: true }
      );
    });

    it('should fail when another user holds the lock', async () => {
      const otherUser = { ...mockUser, id: 'user-2', name: 'Jane Doe' };
      const existingLock = {
        appointmentId,
        userId: otherUser.id,
        expiresAt: new Date(Date.now() + 300000),
        user: otherUser
      };

      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.appointmentLock.findUnique.mockResolvedValue(existingLock);
      mockRedis.del.mockResolvedValue(1);

      await expect(lockService.acquireLock(appointmentId, mockUser.id, mockUserInfo))
        .rejects.toThrow('Appointment is locked by Jane Doe');

      expect(mockRedis.del).toHaveBeenCalledWith(`acquire:${appointmentId}`);
    });

    it('should handle race condition when acquisition lock fails', async () => {
      mockRedis.set.mockResolvedValue(null); // Failed to acquire acquisition lock

      await expect(lockService.acquireLock(appointmentId, mockUser.id, mockUserInfo))
        .rejects.toThrow('Another user is currently acquiring this lock');
    });

    it('should renew existing lock for same user', async () => {
      const existingLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 100000),
        user: mockUser
      };

      const updatedLock = {
        ...existingLock,
        expiresAt: new Date(Date.now() + 300000)
      };

      mockRedis.set.mockResolvedValue('OK');
      mockPrisma.appointmentLock.findUnique.mockResolvedValue(existingLock);
      mockPrisma.appointmentLock.upsert.mockResolvedValue(updatedLock);
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const result = await lockService.acquireLock(appointmentId, mockUser.id, mockUserInfo);

      expect(result.userId).toBe(mockUser.id);
      expect(mockPrisma.appointmentLock.upsert).toHaveBeenCalledWith({
        where: { appointmentId },
        update: { 
          expiresAt: expect.any(Date),
          userId: mockUser.id
        },
        create: {
          appointmentId,
          userId: mockUser.id,
          expiresAt: expect.any(Date)
        },
        include: { user: true }
      });
    });
  });

  describe('releaseLock', () => {
    it('should successfully release own lock', async () => {
      const mockLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 300000)
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(mockLock);
      mockPrisma.appointmentLock.delete.mockResolvedValue(mockLock);
      mockRedis.del.mockResolvedValue(1);

      await lockService.releaseLock(appointmentId, mockUser.id);

      expect(mockPrisma.appointmentLock.delete).toHaveBeenCalledWith({
        where: { appointmentId }
      });
      expect(mockRedis.del).toHaveBeenCalledWith(`lock:${appointmentId}`);
    });

    it('should fail when no lock exists', async () => {
      mockPrisma.appointmentLock.findUnique.mockResolvedValue(null);

      await expect(lockService.releaseLock(appointmentId, mockUser.id))
        .rejects.toThrow('No lock found for this appointment');
    });

    it('should fail when trying to release another user\'s lock', async () => {
      const otherUserLock = {
        appointmentId,
        userId: 'other-user',
        expiresAt: new Date(Date.now() + 300000)
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(otherUserLock);

      await expect(lockService.releaseLock(appointmentId, mockUser.id))
        .rejects.toThrow('You can only release your own locks');
    });
  });

  describe('forceReleaseLock', () => {
    it('should force release any lock', async () => {
      mockPrisma.appointmentLock.deleteMany.mockResolvedValue({ count: 1 });
      mockRedis.del.mockResolvedValue(1);

      await lockService.forceReleaseLock(appointmentId);

      expect(mockPrisma.appointmentLock.deleteMany).toHaveBeenCalledWith({
        where: { appointmentId }
      });
      expect(mockRedis.del).toHaveBeenCalledWith(`lock:${appointmentId}`);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.appointmentLock.deleteMany.mockRejectedValue(new Error('DB Error'));

      await expect(lockService.forceReleaseLock(appointmentId))
        .rejects.toThrow('Failed to force release lock');
    });
  });

  describe('renewLock', () => {
    it('should successfully renew lock within threshold', async () => {
      const mockLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 60000) // 1 minute left
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(mockLock);
      mockPrisma.appointmentLock.update.mockResolvedValue({
        ...mockLock,
        expiresAt: new Date(Date.now() + 300000)
      });
      mockRedis.setEx.mockResolvedValue('OK');

      await lockService.renewLock(appointmentId, mockUser.id);

      expect(mockPrisma.appointmentLock.update).toHaveBeenCalledWith({
        where: { appointmentId },
        data: { expiresAt: expect.any(Date) }
      });
    });

    it('should fail when renewal not yet allowed', async () => {
      const mockLock = {
        appointmentId,
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 240000) // 4 minutes left
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(mockLock);

      await expect(lockService.renewLock(appointmentId, mockUser.id))
        .rejects.toThrow('Lock renewal not yet allowed');
    });

    it('should fail when user does not own lock', async () => {
      const mockLock = {
        appointmentId,
        userId: 'other-user',
        expiresAt: new Date(Date.now() + 60000)
      };

      mockPrisma.appointmentLock.findUnique.mockResolvedValue(mockLock);

      await expect(lockService.renewLock(appointmentId, mockUser.id))
        .rejects.toThrow('Cannot renew lock - not owner or lock not found');
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should clean up all expired locks', async () => {
      const expiredLocks = [
        { appointmentId: 'appt-1', userId: 'user-1', expiresAt: new Date(Date.now() - 1000) },
        { appointmentId: 'appt-2', userId: 'user-2', expiresAt: new Date(Date.now() - 2000) }
      ];

      mockPrisma.appointmentLock.findMany.mockResolvedValue(expiredLocks);
      mockPrisma.appointmentLock.deleteMany.mockResolvedValue({ count: 1 });
      mockRedis.del.mockResolvedValue(1);

      await lockService.cleanupExpiredLocks();

      expect(mockPrisma.appointmentLock.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });
      expect(mockPrisma.appointmentLock.deleteMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('releaseUserLocks', () => {
    it('should release all locks for a user', async () => {
      const userLocks = [
        { appointmentId: 'appt-1', userId: mockUser.id },
        { appointmentId: 'appt-2', userId: mockUser.id }
      ];

      mockPrisma.appointmentLock.findMany.mockResolvedValue(userLocks);
      mockPrisma.appointmentLock.deleteMany.mockResolvedValue({ count: 1 });
      mockRedis.del.mockResolvedValue(1);

      await lockService.releaseUserLocks(mockUser.id);

      expect(mockPrisma.appointmentLock.findMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id }
      });
      expect(mockPrisma.appointmentLock.deleteMany).toHaveBeenCalledTimes(2);
    });
  });
});