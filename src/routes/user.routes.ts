import { Router, RequestHandler } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/register', UserController.register as RequestHandler);
router.post('/login', UserController.login as RequestHandler);
router.post('/refresh-token', UserController.refreshToken as RequestHandler);

// Protected routes
router.post('/logout', authenticate, UserController.logout as RequestHandler);
router.get('/profile', authenticate, UserController.getProfile as RequestHandler);
router.put('/profile', authenticate, UserController.updateProfile as RequestHandler);
router.put('/password', authenticate, UserController.changePassword as RequestHandler);
router.delete('/account', authenticate, UserController.deleteAccount as RequestHandler);

export default router; 