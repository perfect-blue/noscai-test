import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, UserX } from 'lucide-react';
import { useLockSystem } from '@/hooks/useLockSystem';
import { LockStatus } from '@/types/appointment';

interface AdminControlsProps {
  appointmentId: string;
  lockStatus: LockStatus;
  userRole: string;
  className?: string;
}

export const AdminControls: React.FC<AdminControlsProps> = ({
  appointmentId,
  lockStatus,
  userRole,
  className = ''
}) => {
  const { forceRelease, isReleasing } = useLockSystem(appointmentId);
  const [showConfirm, setShowConfirm] = React.useState(false);

  if (userRole !== 'admin' || !lockStatus.isLocked || lockStatus.isOwner) {
    return null;
  }

  const handleForceRelease = () => {
    forceRelease();
    setShowConfirm(false);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-amber-600">
        <Shield className="w-4 h-4" />
        <span className="text-sm font-medium">Admin Controls</span>
      </div>

      {!showConfirm ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          disabled={isReleasing}
        >
          <UserX className="w-4 h-4" />
          Request Control
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-800">
                Force Release Lock
              </h4>
              <p className="text-xs text-red-600 mt-1">
                This will immediately remove {lockStatus.lockedBy?.name}'s editing access. 
                They will lose any unsaved changes.
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleForceRelease}
              disabled={isReleasing}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors disabled:opacity-50"
            >
              {isReleasing ? 'Releasing...' : 'Confirm'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-3 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm rounded-md transition-colors"
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminControls;