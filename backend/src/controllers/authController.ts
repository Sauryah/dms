import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { logAction } from '../lib/auditLogger';
import { JWT_SECRET } from '../lib/config';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password, role, confirmPassword } = req.body;
  const authReq = req as any;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!confirmPassword) {
      return res.status(400).json({ error: 'Please confirm your administrator password to authorize this action.' });
    }

    // Look up currently logged-in Admin user
    const adminUser = await prisma.user.findUnique({
      where: { id: authReq.user.id }
    });

    if (!adminUser) {
      return res.status(401).json({ error: 'Administrator account not found.' });
    }

    // Verify current admin password
    const isAdminPasswordValid = await bcrypt.compare(confirmPassword, adminUser.passwordHash);
    if (!isAdminPasswordValid) {
      return res.status(400).json({ error: 'Administrator password verification failed. Account creation rejected.' });
    }

    // Hash new password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashedPassword,
        role: role || 'VIEWER',
      },
    });
    res.status(201).json({ id: user.id, username: user.username, role: user.role });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and session management
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user and return JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful login audit trail
    await logAction(user.id, user.username, 'LOGIN', 'Auth System', `User "${user.username}" successfully logged in`, req);

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params as { id: string };
  const authReq = req as any;

  try {
    if (!authReq.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Block self-deletion
    if (authReq.user.id === id) {
      return res.status(400).json({ error: 'Self-deletion is blocked. You cannot delete your own active administrator account.' });
    }

    // Block deletion of primary admin account
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (targetUser && targetUser.username === 'admin') {
      return res.status(400).json({ error: 'The primary master "admin" account is protected and cannot be deleted.' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
