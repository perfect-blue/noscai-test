import { useState, useEffect, useCallback } from 'react';
import { useAtom } from 'jotai';
import { lockAtomFamily, updateCursorAtom, currentUserAtom } from '@/store/lockStore';
import { LockStatus } from '@/types/appointment';
import { appointmentApi } from '@/services/api';
import { useWebSocket } from './useWebSocket';

interface UseLockSystemReturn {
  lockStatus: LockStatus | null;
  acquireLock: () => Promise<void>;
  releaseLock: () => Promise<void>;
  forceRelease: () => Promise<void>;
  renewLock: () => Promise<void>;
  updateCursor: (position: { x: number; y: number }) => void;
  isAcquiring: boolean;
  isReleasing: boolean;
}

export const useLockSystem = (appointmentId: string): UseLockSystemReturn => {
  const [lockStatus, setLockStatus] = useAtom(lockAtomFamily(appointmentId));
  const [, updateCursor] = useAtom(updateCursorAtom);
  const [currentUser] = useAtom(currentUserAtom);
  const [isAcquiring, setIsAcquiring] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const { sendCursorUpdate, renewLock: wsRenewLock } = useWebSocket(appointmentId);

  // Fetch initial lock status
  useEffect(() => {
    const fetchLockStatus = async () => {
      try {
        const lock = await appointmentApi.getLockStatus(appointmentId);
        if (lock) {
          const status: LockStatus = {
            isLocked: true,
            isOwner: lock.userId === currentUser?.id,
            canEdit: lock.userId === currentUser?.id,
            appointmentId: lock.appointmentId,
            lockedBy: lock.userInfo,
            expiresAt: lock.expiresAt.toISOString(),
          };
          setLockStatus(status);
        } else {
          setLockStatus({
            isLocked: false,
            isOwner: false,
            canEdit: false,
            appointmentId,
          });
        }
      } catch (error) {
        console.error('Failed to fetch lock status:', error);
      }
    };

    if (currentUser) {
      fetchLockStatus();
    }
  }, [appointmentId, currentUser, setLockStatus]);

  const acquireLock = useCallback(async () => {
    if (!currentUser) throw new Error('User not authenticated');
    
    setIsAcquiring(true);
    try {
      const lock = await appointmentApi.acquireLock(appointmentId);
      const newLockStatus: LockStatus = {
        isLocked: true,
        isOwner: true,
        canEdit: true,
        appointmentId,
        lockedBy: currentUser,
        expiresAt: lock.expiresAt.toISOString(),
      };
      setLockStatus(newLockStatus);
    } catch (error) {
      console.error('Failed to acquire lock:', error);
      throw error;
    } finally {
      setIsAcquiring(false);
    }
  }, [appointmentId, currentUser, setLockStatus]);

  const releaseLock = useCallback(async () => {
    setIsReleasing(true);
    try {
      await appointmentApi.releaseLock(appointmentId);
      setLockStatus({
        isLocked: false,
        isOwner: false,
        canEdit: false,
        appointmentId,
      });
    } catch (error) {
      console.error('Failed to release lock:', error);
      throw error;
    } finally {
      setIsReleasing(false);
    }
  }, [appointmentId, setLockStatus]);

  const forceRelease = useCallback(async () => {
    setIsReleasing(true);
    try {
      await appointmentApi.forceReleaseLock(appointmentId);
      setLockStatus({
        isLocked: false,
        isOwner: false,
        canEdit: false,
        appointmentId,
      });
    } catch (error) {
      console.error('Failed to force release lock:', error);
      throw error;
    } finally {
      setIsReleasing(false);
    }
  }, [appointmentId, setLockStatus]);

  const renewLock = useCallback(async () => {
    if (!lockStatus?.isOwner) return;
    
    try {
      const lock = await appointmentApi.renewLock(appointmentId);
      setLockStatus(prev => prev ? {
        ...prev,
        expiresAt: lock.expiresAt.toISOString(),
      } : null);
    } catch (error) {
      console.error('Failed to renew lock:', error);
      // If renewal fails, release the lock
      await releaseLock();
    }
  }, [appointmentId, lockStatus?.isOwner, setLockStatus, releaseLock]);

  const handleUpdateCursor = useCallback((position: { x: number; y: number }) => {
    if (lockStatus?.isOwner && currentUser) {
      const cursorUpdate = {
        appointmentId,
        userId: currentUser.id,
        userInfo: { name: currentUser.name, email: currentUser.email },
        x: position.x,
        y: position.y,
        timestamp: Date.now()
      };
      updateCursor(cursorUpdate);
      sendCursorUpdate(appointmentId, position.x, position.y);
    }
  }, [appointmentId, lockStatus?.isOwner, currentUser, updateCursor, sendCursorUpdate]);

  // Auto-renewal logic
  useEffect(() => {
    if (!lockStatus?.expiresAt || !lockStatus.isOwner) return;

    const expiryTime = new Date(lockStatus.expiresAt).getTime();
    const renewTime = expiryTime - 60000; // Renew 1 minute before expiry
    const timeUntilRenew = renewTime - Date.now();

    if (timeUntilRenew > 0) {
      const timeout = setTimeout(() => {
        renewLock();
      }, timeUntilRenew);

      return () => clearTimeout(timeout);
    }
  }, [lockStatus, renewLock]);

  // Auto-release on expiry
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
    renewLock,
    updateCursor: handleUpdateCursor,
    isAcquiring,
    isReleasing
  };
};