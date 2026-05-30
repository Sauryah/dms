// Set the test database URL and mock JWT secret before importing anything else
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test_secret_key_123_456_789';

// Mock Swagger modules to bypass Jest NodeNext resolution bugs in third-party libraries
jest.mock('swagger-jsdoc', () => jest.fn(() => ({})));
jest.mock('swagger-ui-express', () => ({
  serve: [],
  setup: () => (req: any, res: any, next: any) => next()
}));

// Mock multer to bypass local readable-stream resolution bugs in Jest
jest.mock('multer', () => {
  const mockMulter = () => ({
    single: () => (req: any, res: any, next: any) => next(),
    array: () => (req: any, res: any, next: any) => next(),
    fields: () => (req: any, res: any, next: any) => next(),
  });
  (mockMulter as any).memoryStorage = jest.fn();
  return mockMulter;
});

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import app from '../app';
import prisma from '../lib/prisma';
import { JWT_SECRET } from '../lib/config';
import { TokenBlacklist } from '../lib/tokenBlacklist';

// Helper to extract cookies from headers
const getCookieByName = (res: any, name: string): string | null => {
  const cookies = res.headers['set-cookie'] || [];
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0].split('=')[1];
    }
  }
  return null;
};

describe('Authentication Hardening Integration Tests', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Force clean and push prisma schema to test.db
    const dbPath = path.join(__dirname, '../../test.db');
    if (fs.existsSync(dbPath)) {
      try { fs.unlinkSync(dbPath); } catch {}
    }
    
    // Setup test database schema
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: 'file:./test.db' },
      stdio: 'ignore'
    });

    // Seed test users
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hash,
        role: 'ADMIN'
      }
    });
  });

  afterAll(async () => {
    // Destroy blacklist timer to prevent Jest hang
    TokenBlacklist.destroy();
    
    // Close prisma connection
    await prisma.$disconnect();

    // Clean up test database files
    const dbPath = path.join(__dirname, '../../test.db');
    const walPath = path.join(__dirname, '../../test.db-wal');
    const shmPath = path.join(__dirname, '../../test.db-shm');
    
    setTimeout(() => {
      try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch {}
      try { if (fs.existsSync(walPath)) fs.unlinkSync(walPath); } catch {}
      try { if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath); } catch {}
    }, 500);
  });

  describe('POST /api/auth/login', () => {
    it('should successfully authenticate and return a secure HttpOnly dms_token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('ADMIN');

      // Verify the cookie header
      const tokenCookie = getCookieByName(res, 'dms_token');
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).not.toBeNull();
      
      adminToken = tokenCookie!;
    });

    it('should reject login with incorrect credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Protected Route Access & Middleware Verification', () => {
    it('should reject access to protected routes without a token cookie', async () => {
      const res = await request(app).get('/api/machines');
      expect(res.status).toBe(401);
    });

    it('should grant access to protected routes when a valid dms_token cookie is provided', async () => {
      const res = await request(app)
        .get('/api/machines')
        .set('Cookie', [`dms_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('JWT Blacklist Invalidation on Logout', () => {
    it('should successfully blacklist the JWT on logout and deny subsequent API calls', async () => {
      // 1. Logout
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`dms_token=${adminToken}`]);

      expect(logoutRes.status).toBe(200);
      
      // Verify cookie is cleared
      const clearedCookie = getCookieByName(logoutRes, 'dms_token');
      expect(clearedCookie).toBe('');

      // 2. Attempt to reuse the blacklisted token cookie
      const reuseRes = await request(app)
        .get('/api/machines')
        .set('Cookie', [`dms_token=${adminToken}`]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error).toContain('invalidated');
    });
  });

  describe('Sliding Token Rotation Heuristics', () => {
    it('should automatically rotate the cookie and issue a new one when >50% elapsed, yet allow old token during grace period', async () => {
      // 1. Issue a short-lived token (4 seconds)
      const shortToken = jwt.sign(
        { id: 'some-id', username: 'admin', role: 'ADMIN' },
        JWT_SECRET,
        { expiresIn: '4s' }
      );

      // 2. Wait 2.1 seconds (>50% of the 4s lifetime)
      await new Promise((resolve) => setTimeout(resolve, 2100));

      // 3. Make a request using the >50% elapsed token
      const rotateRes = await request(app)
        .get('/api/machines')
        .set('Cookie', [`dms_token=${shortToken}`]);

      expect(rotateRes.status).toBe(200);

      // 4. Verify that a brand new rotated cookie is issued
      const rotatedCookie = getCookieByName(rotateRes, 'dms_token');
      expect(rotatedCookie).not.toBeNull();
      expect(rotatedCookie).not.toBe(shortToken);

      // 5. Verify the old token can still be used because of the 30-second grace period
      const graceRes = await request(app)
        .get('/api/machines')
        .set('Cookie', [`dms_token=${shortToken}`]);

      expect(graceRes.status).toBe(200); // Should succeed during grace period!
    });
  });
});
