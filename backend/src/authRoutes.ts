import { Router } from 'express';
import { getUsers, login, getCurrentUser } from './authController';
import { authMiddleware } from './auth';

const router = Router();

router.get('/users', getUsers);
router.post('/login', login);
router.get('/me', authMiddleware, getCurrentUser);

export default router;