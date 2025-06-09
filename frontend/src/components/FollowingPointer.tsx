import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAtom } from 'jotai';
import { getCursorsForAppointment } from '@/store/lockStore';
import { CursorUpdate } from '@/types/appointment';

interface FollowingPointerProps {
  appointmentId: string;
  className?: string;
}

interface PointerProps {
  cursor: CursorUpdate;
}

const Pointer: React.FC<PointerProps> = ({ cursor }) => {
  return (
    <motion.div
      className="fixed pointer-events-none z-50"
      style={{
        left: cursor.x,
        top: cursor.y,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Cursor pointer */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform -translate-x-1 -translate-y-1"
      >
        <path
          d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
          fill="#3B82F6"
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      
      {/* User name badge */}
      <motion.div
        className="ml-4 -mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-md shadow-lg"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        {cursor.userInfo.name}
      </motion.div>
      
      {/* Ripple effect */}
      <motion.div
        className="absolute -top-2 -left-2 w-6 h-6 border-2 border-blue-400 rounded-full"
        animate={{
          scale: [1, 2, 1],
          opacity: [0.8, 0, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
};

export const FollowingPointer: React.FC<FollowingPointerProps> = ({ 
  appointmentId,
  className = '' 
}) => {
  const [cursors] = useAtom(getCursorsForAppointment(appointmentId));
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Clean up cursors after inactivity
  useEffect(() => {
    cursors.forEach((cursor) => {
      if (timeoutRef.current[cursor.userId]) {
        clearTimeout(timeoutRef.current[cursor.userId]);
      }
      
      timeoutRef.current[cursor.userId] = setTimeout(() => {
        // Remove cursor after 3 seconds of inactivity
        // This would need to be implemented in the cursor atom
      }, 3000);
    });

    return () => {
      Object.values(timeoutRef.current).forEach(clearTimeout);
    };
  }, [cursors]);

  return (
    <div className={className}>
      <AnimatePresence>
        {cursors.map((cursor) => (
          <Pointer key={cursor.userId} cursor={cursor} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FollowingPointer;