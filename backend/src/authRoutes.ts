import { Router } from 'express';
import { getUsers, devLogin } from './authController';

const router = Router();

router.get('/users', getUsers);
router.post('/dev-login', devLogin);

export default router;