// Set the test database URL and mock JWT secret before importing anything else
process.env.DATABASE_URL = 'postgresql://dms_user:dms_password@localhost:5432/dms_prod?schema=test_features';
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
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import app from '../app';
import prisma from '../lib/prisma';
import { TokenBlacklist } from '../lib/tokenBlacklist';

const getCookieByName = (res: any, name: string): string | null => {
  const cookies = res.headers['set-cookie'] || [];
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split(';')[0].split('=')[1];
    }
  }
  return null;
};

describe('Enterprise Features Integration Tests', () => {
  let adminToken: string;
  let operatorToken1: string;
  let operatorToken2: string;

  beforeAll(async () => {
    // Setup test database schema
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: 'postgresql://dms_user:dms_password@localhost:5432/dms_prod?schema=test_features' },
      stdio: 'ignore'
    });

    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('password123', 10);

    // Create Admin User
    await prisma.user.create({
      data: {
        username: 'admin_user',
        passwordHash: hash,
        role: 'ADMIN'
      }
    });

    // Create Operator Users
    await prisma.user.create({
      data: {
        username: 'operator_1',
        passwordHash: hash,
        role: 'OPERATOR'
      }
    });

    await prisma.user.create({
      data: {
        username: 'operator_2',
        passwordHash: hash,
        role: 'OPERATOR'
      }
    });

    // Obtain JWT cookies
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin_user', password: 'password123' });
    adminToken = getCookieByName(adminLogin, 'dms_token')!;

    const opLogin1 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator_1', password: 'password123' });
    operatorToken1 = getCookieByName(opLogin1, 'dms_token')!;

    const opLogin2 = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator_2', password: 'password123' });
    operatorToken2 = getCookieByName(opLogin2, 'dms_token')!;
  }, 30000);

  afterAll(async () => {
    // Cleanup blacklist interval timer
    TokenBlacklist.destroy();

    // Drop the test schema to clean up
    try {
      await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS "test_features" CASCADE;');
    } catch (err) {
      console.warn('Failed to drop schema test_features:', err);
    }

    // Close prisma connection
    await prisma.$disconnect();
  });

  describe('Item 1: Real-time Tooling Lock System', () => {
    const targetEntityId = 'machine-uuid-101';

    it('should acquire lock successfully for Operator 1', async () => {
      const res = await request(app)
        .post('/api/locks/acquire')
        .set('Cookie', [`dms_token=${operatorToken1}`])
        .send({ entityId: targetEntityId });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('acquired successfully');
      expect(res.body.lock).toBeDefined();
      expect(res.body.lock.entityId).toBe(targetEntityId);
      expect(res.body.lock.operatorName).toBe('operator_1');
    });

    it('should return 409 Conflict when Operator 2 tries to acquire lock on the same resource', async () => {
      const res = await request(app)
        .post('/api/locks/acquire')
        .set('Cookie', [`dms_token=${operatorToken2}`])
        .send({ entityId: targetEntityId });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('locked by another operator');
      expect(res.body.lock.operatorName).toBe('operator_1');
    });

    it('should return 403 Forbidden when Operator 2 tries to release Operator 1\'s lock', async () => {
      const res = await request(app)
        .post('/api/locks/release')
        .set('Cookie', [`dms_token=${operatorToken2}`])
        .send({ entityId: targetEntityId });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('do not own this lock');
    });

    it('should return all active locks in the list', async () => {
      const res = await request(app)
        .get('/api/locks')
        .set('Cookie', [`dms_token=${operatorToken1}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].entityId).toBe(targetEntityId);
    });

    it('should release lock successfully for Operator 1', async () => {
      const res = await request(app)
        .post('/api/locks/release')
        .set('Cookie', [`dms_token=${operatorToken1}`])
        .send({ entityId: targetEntityId });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('released successfully');
    });
  });

  describe('Item 2: Database Backup Management', () => {
    it('should reject non-admin users from listing or triggering backups', async () => {
      const res1 = await request(app)
        .get('/api/dev/database/backups')
        .set('Cookie', [`dms_token=${operatorToken1}`]);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .post('/api/dev/database/backup')
        .set('Cookie', [`dms_token=${operatorToken1}`]);
      expect(res2.status).toBe(403);
    });

    it('should return all backups array for Admin', async () => {
      const res = await request(app)
        .get('/api/dev/database/backups')
        .set('Cookie', [`dms_token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 400 when attempting backup with non-PostgreSQL config', async () => {
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'file:./test.db'; // Set to SQLite url to trigger validation
      try {
        const res = await request(app)
          .post('/api/dev/database/backup')
          .set('Cookie', [`dms_token=${adminToken}`]);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid DATABASE_URL');
      } finally {
        process.env.DATABASE_URL = originalUrl;
      }
    });

    it('should return 404 when deleting a nonexistent backup file', async () => {
      const res = await request(app)
        .delete('/api/dev/database/backups/nonexistent_file.dump')
        .set('Cookie', [`dms_token=${adminToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });
  });

  describe('Excel Bulk Import Confirm Endpoint', () => {
    let setUuid: string;

    beforeAll(async () => {
      // Create a test Set to link the imported die to
      const testSet = await prisma.set.create({
        data: {
          name: 'ImportTestSet',
          description: 'Used for import test casing'
        }
      });
      setUuid = testSet.id;
    });

    it('should successfully confirm and insert valid die bulk imports', async () => {
      const res = await request(app)
        .post('/api/dies/import-confirm')
        .set('Cookie', [`dms_token=${adminToken}`])
        .send({
          rows: [
            {
              dieId: 'DIE-TEST-IMPORT-1',
              size: '14.25mm',
              casing: 'alloy-casing',
              details: 'Imported via Jest integration test',
              setName: 'ImportTestSet'
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Import completed successfully');
      expect(res.body.successCount).toBe(1);

      // Verify the record is in the database and linked to the correct set
      const dieRecord = await prisma.die.findUnique({
        where: { dieId: 'DIE-TEST-IMPORT-1' },
        include: { set: true }
      });

      expect(dieRecord).not.toBeNull();
      expect(dieRecord!.size).toBe('14.250mm');
      expect(dieRecord!.casing).toBe('alloy-casing');
      expect(dieRecord!.setId).toBe(setUuid);
      expect(dieRecord!.set!.name).toBe('ImportTestSet');
    });

    it('should fail confirm when rows data is invalid or missing', async () => {
      const res = await request(app)
        .post('/api/dies/import-confirm')
        .set('Cookie', [`dms_token=${adminToken}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid or empty rows');
    });
  });
});
