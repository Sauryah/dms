import { Router } from 'express';
import { register, login, getUsers, deleteUser, changePassword } from '../controllers/authController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validationMiddleware';
import { changePasswordSchema, loginSchema, registerSchema } from '../lib/schemas';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes with brute-force protection
router.post('/login', authLimiter, validateBody(loginSchema), login);

// Authenticated user routes
router.post('/change-password', authenticate, validateBody(changePasswordSchema), changePassword);

// Admin-only routes
router.post('/register', authenticate, authorize(['ADMIN']), validateBody(registerSchema), register);
router.get('/users', authenticate, authorize(['ADMIN']), getUsers);
router.delete('/users/:id', authenticate, authorize(['ADMIN']), deleteUser);

export default router;
