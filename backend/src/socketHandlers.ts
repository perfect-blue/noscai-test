import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { lockService } from './lockService';

interface SocketUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
      socket.join(`appointment:${appointmentId}`);
      console.log(`User ${socket.data.user.name} joined appointment ${appointmentId}`);
    });

    // Leave appointment room
    socket.on('leaveAppointment', (appointmentId: string) => {
      socket.leave(`appointment:${appointmentId}`);
    });

    // Handle cursor/pointer updates
    socket.on('cursorUpdate', (data: { appointmentId: string; x: number; y: number }) => {
      socket.to(`appointment:${data.appointmentId}`).emit('cursorUpdate', {
        userId: socket.data.user.id,
        userInfo: {
          name: socket.data.user.name,
          email: socket.data.user.email
        },
        x: data.x,
        y: data.y
      });
    });

    // Handle lock renewal
    socket.on('renewLock', async (appointmentId: string) => {
      try {
        await lockService.renewLock(appointmentId, socket.data.user.id);
        socket.emit('lockRenewed', { appointmentId });
      } catch (error) {
        socket.emit('lockRenewalFailed', { appointmentId, error: (error as Error).message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.data.user.name} disconnected`);
    });
  });
}