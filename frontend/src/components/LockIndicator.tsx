import React from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Clock } from 'lucide-react';
import { LockStatus } from '@/types/appointment';

interface LockIndicatorProps {
  lockStatus: LockStatus | null;
  className?: string;
}

export const LockIndicator: React.FC<LockIndicatorProps> = ({ 
  lockStatus, 
  className = '' 
}) => {
  // Handle null lockStatus
  if (!lockStatus) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        <span className="text-sm">Loading lock status...</span>
      </div>
    );
  }

  if (!lockStatus.isLocked) {
    return (
      <div className={`flex items-center gap-2 text-green-400 ${className}`}>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="text-sm">Available for editing</span>
      </div>
    );
  }

  const timeLeft = lockStatus.expiresAt 
    ? Math.max(0, Math.floor((new Date(lockStatus.expiresAt).getTime() - Date.now()) / 1000))
    : 0;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        lockStatus.isOwner 
          ? 'bg-blue-50 border-blue-200 text-blue-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      } ${className}`}
    >
      <Lock className="w-4 h-4" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <User className="w-3 h-3" />
          <span className="text-sm font-medium">
            {lockStatus.isOwner ? 'You are editing' : `Locked by ${lockStatus.lockedBy?.name}`}
          </span>
        </div>
        {lockStatus.expiresAt && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {minutes}:{seconds.toString().padStart(2, '0')} remaining
            </span>
          </div>
        )}
      </div>
      {lockStatus.isOwner && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-2 h-2 bg-blue-400 rounded-full"
        />
      )}
    </motion.div>
  );
};

export default LockIndicator;