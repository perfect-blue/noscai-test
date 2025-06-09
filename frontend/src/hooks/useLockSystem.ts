import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { lockAtom, updateCursorAtom } from '@/store/lockStore';
import { LockStatus } from '@/types/appointment';

interface UseLockSystemReturn {
  lockStatus: LockStatus | null;
  acquireLock: () => Promise<void>;
  releaseLock: () => Promise<void>;
  forceRelease: () => Promise<void>;
  updateCursor: (position: { x: number; y: number }) => void;
  isAcquiring: boolean;
  isReleasing: boolean;
}

export const useLockSystem = (appointmentId: string): UseLockSystemReturn => {
  const [lockStatus, setLockStatus] = useAtom(lockAtom);
  const [, updateCursor] = useAtom(updateCursorAtom);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  // Mock API calls - replace with actual API
  const acquireLock = useCallback(async () => {
    setIsAcquiring(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newLockStatus: LockStatus = {
        isLocked: true,
        isOwner: true,
        appointmentId,
        lockedBy: {
          id: 'current-user',
          name: 'Current User',
          email: 'user@example.com'
        },
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      };
      
      setLockStatus(newLockStatus);
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      throw error;
    } finally {
      setIsAcquiring(false);
    }
  }, [appointmentId, setLockStatus]);

  const releaseLock = useCallback(async () => {
    setIsReleasing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setLockStatus(null);
    } catch (error) {
      console.error('Failed to release lock:', error);
      throw error;
    } finally {
      setIsReleasing(false);
    }
  }, [setLockStatus]);

  const forceRelease = useCallback(async () => {
    setIsReleasing(true);
    try {
      // Simulate admin force release
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLockStatus(null);
    } catch (error) {
      console.error('Failed to force release lock:', error);
      throw error;
    } finally {
      setIsReleasing(false);
    }
  }, [setLockStatus]);

  const handleUpdateCursor = useCallback((position: { x: number; y: number }) => {
    if (lockStatus?.isOwner) {
      updateCursor({
        appointmentId,
        userId: 'current-user',
        userInfo: { name: 'Current User', email: 'user@example.com' },
        x: position.x,
        y: position.y,
        timestamp: Date.now()
      });
    }
  }, [appointmentId, lockStatus?.isOwner, updateCursor]);

  // Auto-release lock on expiry
  useEffect(() => {
    if (!lockStatus?.expiresAt || !lockStatus.isOwner) return;

    const expiryTime = new Date(lockStatus.expiresAt).getTime();
    const timeLeft = expiryTime - Date.now();

    if (timeLeft <= 0) {
      releaseLock();
      return;
    }

    const timeout = setTimeout(() => {
      releaseLock();
    }, timeLeft);

    return () => clearTimeout(timeout);
  }, [lockStatus, releaseLock]);

  return {
    lockStatus,
    acquireLock,
    releaseLock,
    forceRelease,
    updateCursor: handleUpdateCursor,
    isAcquiring,
    isReleasing
  };
};