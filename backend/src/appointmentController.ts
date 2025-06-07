import { Request, Response } from 'express';
import { lockService } from './lockService';
import { io } from './app';

export const getLockStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lockStatus = await lockService.getLockStatus(id);
    res.json(lockStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get lock status' });
  }
};

export const acquireLock = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id || !req.user.name || !req.user.email) {
        throw new Error('Missing required user information');
    }

    const { id } = req.params;
    const userId = req.user.id;
    const userInfo = { name: req.user.name, email: req.user.email };

    const lock = await lockService.acquireLock(id, userId, userInfo);
    
    // Emit lock acquired event
    io.to(`appointment:${id}`).emit('lockAcquired', {
      appointmentId: id,
      userId,
      userInfo
    });

    res.json(lock);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const releaseLock = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) {
        throw new Error('Missing required user information');
    }

    const { id } = req.params;
    const userId = req.user.id;

    await lockService.releaseLock(id, userId);

    // Emit lock released event
    io.to(`appointment:${id}`).emit('lockReleased', {
      appointmentId: id,
      userId
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const forceReleaseLock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await lockService.forceReleaseLock(id);

    // Emit force release event
    io.to(`appointment:${id}`).emit('lockForceReleased', {
      appointmentId: id,
      releasedBy: userId
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};