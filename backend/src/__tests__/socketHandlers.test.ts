import { Server } from 'socket.io';
import { createServer } from 'http';
import ioc from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { setupSocketHandlers } from '../socketHandlers';
import { lockService } from '../lockService';

// Mock dependencies
jest.mock('../lockService');
const mockLockService = lockService as jest.Mocked<typeof lockService>;

describe('Socket Handlers', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let httpServer: any;

  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user'
  };

  const validToken = jwt.sign(mockUser, 'test-secret');

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    setupSocketHandlers(io);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      clientSocket = ioc(`http://localhost:${port}`, {
        auth: { token: validToken }
      });
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });

    // Mock JWT_SECRET
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should reject connection without token', (done) => {
      const unauthorizedClient = ioc(`http://localhost:${(httpServer.address() as any).port}`);
      
      unauthorizedClient.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication error');
        unauthorizedClient.close();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const unauthorizedClient = ioc(`http://localhost:${(httpServer.address() as any).port}`, {
        auth: { token: 'invalid-token' }
      });
      
      unauthorizedClient.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication error');
        unauthorizedClient.close();
        done();
      });
    });
  });

  describe('Appointment Room Management', () => {
    it('should join appointment room', (done) => {
      const appointmentId = 'appt-001';
      
      serverSocket.on('joinAppointment', (id: string) => {
        expect(id).toBe(appointmentId);
        expect(serverSocket.rooms.has(`appointment:${appointmentId}`)).toBe(true);
        done();
      });
      
      clientSocket.emit('joinAppointment', appointmentId);
    });

    it('should leave appointment room', (done) => {
      const appointmentId = 'appt-001';
      
      // First join
      serverSocket.join(`appointment:${appointmentId}`);
      
      serverSocket.on('leaveAppointment', (id: string) => {
        expect(id).toBe(appointmentId);
        expect(serverSocket.rooms.has(`appointment:${appointmentId}`)).toBe(false);
        done();
      });
      
      clientSocket.emit('leaveAppointment', appointmentId);
    });

    it('should handle invalid appointment ID', (done) => {
      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Invalid appointment ID');
        done();
      });
      
      clientSocket.emit('joinAppointment', null);
    });
  });

  describe('Lock Renewal', () => {
    it('should successfully renew lock', (done) => {
      const appointmentId = 'appt-001';
      mockLockService.renewLock.mockResolvedValue();
      
      clientSocket.on('lockRenewed', (data: any) => {
        expect(data.appointmentId).toBe(appointmentId);
        done();
      });
      
      clientSocket.emit('renewLock', appointmentId);
    });

    it('should handle lock renewal failure', (done) => {
      const appointmentId = 'appt-001';
      mockLockService.renewLock.mockRejectedValue(new Error('Cannot renew lock'));
      
      clientSocket.on('lockRenewalFailed', (data: any) => {
        expect(data.appointmentId).toBe(appointmentId);
        expect(data.error).toBe('Cannot renew lock');
        done();
      });
      
      clientSocket.emit('renewLock', appointmentId);
    });
  });

  describe('Cursor Updates', () => {
    it('should broadcast cursor updates', (done) => {
      const appointmentId = 'appt-001';
      const cursorData = { appointmentId, x: 100, y: 200 };
      
      // Create second client to receive broadcast
      const secondClient = ioc(`http://localhost:${(httpServer.address() as any).port}`, {
        auth: { token: validToken }
      });
      
      secondClient.on('cursorUpdate', (data: any) => {
        expect(data.userId).toBe(mockUser.id);
        expect(data.x).toBe(100);
        expect(data.y).toBe(200);
        expect(data.userInfo).toEqual({
          name: mockUser.name,
          email: mockUser.email
        });
        secondClient.close();
        done();
      });
      
      // Both clients join the same room
      clientSocket.emit('joinAppointment', appointmentId);
      secondClient.emit('joinAppointment', appointmentId);
      
      setTimeout(() => {
        clientSocket.emit('cursorUpdate', cursorData);
      }, 100);
    });
  });

  describe('Disconnect Handling', () => {
    it('should release user locks on disconnect', (done) => {
      mockLockService.releaseUserLocks.mockResolvedValue();
      
      serverSocket.on('disconnect', () => {
        setTimeout(() => {
          expect(mockLockService.releaseUserLocks).toHaveBeenCalledWith(mockUser.id);
          done();
        }, 100);
      });
      
      clientSocket.disconnect();
    });
  });
});