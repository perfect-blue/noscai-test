import { Router } from 'express';
import {
  getLockStatus,
  acquireLock,
  releaseLock,
  forceReleaseLock
} from './appointmentController';

const router = Router();

router.get('/:id/lock-status', getLockStatus);
router.post('/:id/acquire-lock', acquireLock);
router.delete('/:id/release-lock', releaseLock);
router.delete('/:id/force-release-lock', forceReleaseLock);

export default router;