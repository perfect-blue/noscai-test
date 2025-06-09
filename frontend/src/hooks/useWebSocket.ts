import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { io, Socket } from 'socket.io-client';
import { 
  isConnectedAtom, 
  updateLockAction, 
  updateCursorsAction,
  cursorsAtom,
  currentUserAtom 
} from '@/store/lockStore';
import { CursorUpdate } from '@/types/appointment';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export const useWebSocket = (appointmentId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useAtom(isConnectedAtom);
  const [, updateLock] = useAtom(updateLockAction);
  const [, updateCursors] = useAtom(updateCursorsAction);
  const [cursors] = useAtom(cursorsAtom);
  const [currentUser] = useAtom(currentUserAtom);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      if (appointmentId) {
        socket.emit('joinAppointment', appointmentId);
      }
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    // Lock events
    socket.on('lockAcquired', (data) => {
      updateLock({
        appointmentId: data.appointmentId,
        lock: {
          appointmentId: data.appointmentId,
          userId: data.userId,
          userInfo: data.userInfo,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        },
      });
    });

    socket.on('lockReleased', (data) => {
      updateLock({
        appointmentId: data.appointmentId,
        lock: null,
      });
    });

    socket.on('lockForceReleased', (data) => {
      updateLock({
        appointmentId: data.appointmentId,
        lock: null,
      });
    });

    // Cursor events
    socket.on('cursorUpdate', (data: CursorUpdate) => {
      if (!appointmentId) return;
      
      const currentCursors = cursors[appointmentId] || [];
      const updatedCursors = currentCursors.filter(cursor => cursor.userId !== data.userId);
      updatedCursors.push(data);
      
      updateCursors({
        appointmentId,
        cursors: updatedCursors,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [appointmentId, setIsConnected, updateLock, updateCursors, cursors]);

  const joinAppointment = (id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('joinAppointment', id);
    }
  };

  const leaveAppointment = (id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leaveAppointment', id);
    }
  };

  const sendCursorUpdate = (appointmentId: string, x: number, y: number) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('cursorUpdate', { appointmentId, x, y });
    }
  };

  const renewLock = (appointmentId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('renewLock', appointmentId);
    }
  };

  return {
    isConnected,
    joinAppointment,
    leaveAppointment,
    sendCursorUpdate,
    renewLock,
  };
};