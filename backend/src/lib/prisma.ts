import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

if (process.env.DATABASE_URL?.startsWith('file:')) {
  // Enable SQLite Write-Ahead Logging (WAL) mode and 5s busy timeout to handle concurrent access
  prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;').catch((err) => {
    console.error('Failed to enable SQLite WAL mode:', err);
  });
  prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;').catch((err) => {
    console.error('Failed to configure SQLite busy_timeout:', err);
  });
}

export default prisma;
