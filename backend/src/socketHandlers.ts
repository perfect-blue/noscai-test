import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { lockService } from './lockService';
import rateLimit from 'express-rate-limit';

interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CursorData {
  appointmentId: string;
  x: number;
  y: number;
}

// Rate limiting for cursor updates
const cursorUpdateLimiter = new Map<string, number>();
const CURSOR_UPDATE_THROTTLE = 50; // 50ms throttle

export function setupSocketHandlers(io: Server) {
  // Authentication middleware for WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`User ${socket.data.user.name} connected`);

    // Join appointment room
    socket.on('joinAppointment', (appointmentId: string) => {
      if (!appointmentId || typeof appointmentId !== 'string') {
        socket.emit('error', { message: 'Invalid appointment ID' });
        return;
      }
      
      socket.join(`appointment:${appointmentId}`);
      console.log(`User ${socket.data.user.name} joined appointment ${appointmentId}`);
      
      // Notify others in the room
      socket.to(`appointment:${appointmentId}`).emit('userJoined', {
        userId: socket.data.user.id,
        userInfo: {
          name: socket.data.user.name,
          email: socket.data.user.email
        }
      });
    });

    // Leave appointment room
    socket.on('leaveAppointment', (appointmentId: string) => {
      if (!appointmentId || typeof appointmentId !== 'string') {
        return;
      }
      
      socket.leave(`appointment:${appointmentId}`);
      
      // Notify others in the room
      socket.to(`appointment:${appointmentId}`).emit('userLeft', {
        userId: socket.data.user.id
      });
    });

    // Handle cursor/pointer updates with throttling
    socket.on('cursorUpdate', (data: CursorData) => {
      if (!data.appointmentId || typeof data.x !== 'number' || typeof data.y !== 'number') {
        return;
      }

      const userId = socket.data.user.id;
      const now = Date.now();
      const lastUpdate = cursorUpdateLimiter.get(userId) || 0;

      if (now - lastUpdate < CURSOR_UPDATE_THROTTLE) {
        return; // Throttle updates
      }

      cursorUpdateLimiter.set(userId, now);

      socket.to(`appointment:${data.appointmentId}`).emit('cursorUpdate', {
        userId: socket.data.user.id,
        userInfo: {
          name: socket.data.user.name,
          email: socket.data.user.email
        },
        x: data.x,
        y: data.y,
        timestamp: now
      });
    });

    // Handle lock renewal
    socket.on('renewLock', async (appointmentId: string) => {
      if (!appointmentId || typeof appointmentId !== 'string') {
        socket.emit('lockRenewalFailed', { 
          appointmentId, 
          error: 'Invalid appointment ID' 
        });
        return;
      }

      try {
        await lockService.renewLock(appointmentId, socket.data.user.id);
        socket.emit('lockRenewed', { appointmentId });
        
        // Notify others in the room
        socket.to(`appointment:${appointmentId}`).emit('lockRenewed', {
          appointmentId,
          userId: socket.data.user.id,
          userInfo: {
            name: socket.data.user.name,
            email: socket.data.user.email
          }
        });
      } catch (error) {
        socket.emit('lockRenewalFailed', { 
          appointmentId, 
          error: (error as Error).message 
        });
      }
    });

    // Handle disconnect - release all user locks
    socket.on('disconnect', async () => {
      console.log(`User ${socket.data.user.name} disconnected`);
      
      try {
        // Release all locks held by this user
        await lockService.releaseUserLocks(socket.data.user.id);
        
        // Notify all rooms about user disconnect
        socket.broadcast.emit('userDisconnected', {
          userId: socket.data.user.id
        });
        
        // Clean up cursor update throttling
        cursorUpdateLimiter.delete(socket.data.user.id);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle explicit lock release request
    socket.on('requestLockRelease', async (appointmentId: string) => {
      if (!appointmentId || typeof appointmentId !== 'string') {
        return;
      }

      try {
        await lockService.releaseLock(appointmentId, socket.data.user.id);
        
        // Notify all users in the appointment room
        io.to(`appointment:${appointmentId}`).emit('lockReleased', {
          appointmentId,
          userId: socket.data.user.id
        });
      } catch (error) {
        socket.emit('lockReleaseError', {
          appointmentId,
          error: (error as Error).message
        });
      }
    });
  });
}