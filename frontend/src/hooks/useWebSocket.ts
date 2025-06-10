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

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export const useWebSocket = (appointmentId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useAtom(isConnectedAtom);
  const [, updateLock] = useAtom(updateLockAction);
  const [, updateCursors] = useAtom(updateCursorsAction);
  const [cursors] = useAtom(cursorsAtom);
  const [currentUser] = useAtom(currentUserAtom);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('No auth token found, skipping WebSocket connection');
      return;
    }

    console.log('Attempting to connect to WebSocket at:', WS_URL);
    
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      if (appointmentId) {
        console.log('Joining appointment:', appointmentId);
        socket.emit('joinAppointment', appointmentId);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      if (appointmentId) {
        socket.emit('joinAppointment', appointmentId);
      }
    });

    socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    // Lock events
    socket.on('lockAcquired', (data) => {
      console.log('Lock acquired event received:', data);
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
      console.log('Lock released event received:', data);
      updateLock({
        appointmentId: data.appointmentId,
        lock: null,
      });
    });

    socket.on('lockForceReleased', (data) => {
      console.log('Lock force released event received:', data);
      updateLock({
        appointmentId: data.appointmentId,
        lock: null,
      });
    });

    // Cursor events
    socket.on('cursorUpdate', (data: CursorUpdate) => {
      console.log('Cursor update received:', data);
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
      console.log('Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, [appointmentId, setIsConnected, updateLock, updateCursors, cursors]);

  const joinAppointment = (id: string) => {
    if (socketRef.current && isConnected) {
      console.log('Joining appointment:', id);
      socketRef.current.emit('joinAppointment', id);
    }
  };

  const leaveAppointment = (id: string) => {
    if (socketRef.current && isConnected) {
      console.log('Leaving appointment:', id);
      socketRef.current.emit('leaveAppointment', id);
    }
  };

  const sendCursorUpdate = (appointmentId: string, x: number, y: number) => {
    if (socketRef.current && isConnected) {
      console.log('Sending cursor update via WebSocket:', { appointmentId, x, y });
      socketRef.current.emit('cursorUpdate', { appointmentId, x, y });
    } else {
      console.log('WebSocket not connected, cannot send cursor update. Connected:', isConnected);
    }
  };

  const renewLock = (appointmentId: string) => {
    if (socketRef.current && isConnected) {
      console.log('Renewing lock for appointment:', appointmentId);
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