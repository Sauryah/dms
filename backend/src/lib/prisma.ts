import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// Enable SQLite Write-Ahead Logging (WAL) mode and 5s busy timeout to handle concurrent access
prisma.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch((err) => {
  console.error('Failed to enable SQLite WAL mode:', err);
});
prisma.$executeRawUnsafe('PRAGMA busy_timeout=5000;').catch((err) => {
  console.error('Failed to configure SQLite busy_timeout:', err);
});

export default prisma;
