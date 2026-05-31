import fs from 'fs';
import path from 'path';
import prisma from './prisma';

// The path to the SQLite database file inside the container
const sqliteDbPath = '/app/data/prod.db';
const markerFilePath = '/app/data/.migrated_to_postgres';

function openSqliteDb(dbPath: string): Promise<any> {
  // Dynamically import sqlite3 to ensure the server starts even if sqlite3 isn't loaded
  const sqlite3 = require('sqlite3').verbose();
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err: any) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function queryAll(db: any, sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function runAutoMigration(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || '';
  
  // 1. Only run if we are active on PostgreSQL
  if (!dbUrl.startsWith('postgresql')) {
    return;
  }

  // 2. Check if a SQLite database file exists to migrate from
  if (!fs.existsSync(sqliteDbPath)) {
    return;
  }

  // 3. Check if the database has already been successfully migrated
  if (fs.existsSync(markerFilePath)) {
    return;
  }

  console.log('------------------------------------------------------------');
  console.log('SQLite database file detected at /app/data/prod.db.');
  console.log('Starting AUTOMATIC zero-data-loss migration to PostgreSQL...');
  console.log('------------------------------------------------------------');

  let db: any;
  try {
    db = await openSqliteDb(sqliteDbPath);
    console.log(`[AutoMigration] Connected to SQLite database at ${sqliteDbPath}`);

    // --- 1. Migrate Machines ---
    console.log('[AutoMigration] Porting Machines...');
    const machines = await queryAll(db, 'SELECT * FROM Machine');
    for (const m of machines) {
      await prisma.machine.upsert({
        where: { id: m.id },
        update: { name: m.name, location: m.location },
        create: { id: m.id, name: m.name, location: m.location }
      });
    }

    // --- 2. Migrate Sets ---
    console.log('[AutoMigration] Porting Sets...');
    const sets = await queryAll(db, 'SELECT * FROM "Set"');
    for (const s of sets) {
      await prisma.set.upsert({
        where: { id: s.id },
        update: { name: s.name, description: s.description, machineId: s.machineId },
        create: { id: s.id, name: s.name, description: s.description, machineId: s.machineId }
      });
    }

    // --- 3. Migrate Dies ---
    console.log('[AutoMigration] Porting Dies...');
    const dies = await queryAll(db, 'SELECT * FROM Die');
    for (const d of dies) {
      const createdAtDate = d.createdAt ? new Date(d.createdAt) : new Date();
      await prisma.die.upsert({
        where: { id: d.id },
        update: {
          dieId: d.dieId,
          size: d.size,
          sizeValue: d.sizeValue || 0.0,
          casing: d.casing,
          details: d.details,
          createdAt: createdAtDate,
          setId: d.setId
        },
        create: {
          id: d.id,
          dieId: d.dieId,
          size: d.size,
          sizeValue: d.sizeValue || 0.0,
          casing: d.casing,
          details: d.details,
          createdAt: createdAtDate,
          setId: d.setId
        }
      });
    }

    // --- 4. Migrate AuditLogs ---
    console.log('[AutoMigration] Porting Audit Logs...');
    const auditLogs = await queryAll(db, 'SELECT * FROM AuditLog');
    for (const log of auditLogs) {
      const createdAtDate = log.createdAt ? new Date(log.createdAt) : new Date();
      await prisma.auditLog.upsert({
        where: { id: log.id },
        update: {
          actorId: log.actorId,
          actorName: log.actorName,
          action: log.action,
          target: log.target,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: createdAtDate
        },
        create: {
          id: log.id,
          actorId: log.actorId,
          actorName: log.actorName,
          action: log.action,
          target: log.target,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: createdAtDate
        }
      });
    }

    // --- 5. Migrate Users ---
    console.log('[AutoMigration] Porting Users...');
    const users = await queryAll(db, 'SELECT * FROM User');
    for (const u of users) {
      await prisma.user.upsert({
        where: { username: u.username },
        update: { passwordHash: u.passwordHash, role: u.role },
        create: { id: u.id, username: u.username, passwordHash: u.passwordHash, role: u.role }
      });
    }

    // 4. Create the marker file so we never run this again
    fs.writeFileSync(markerFilePath, 'MIGRATED', 'utf8');

    console.log('------------------------------------------------------------');
    console.log('AUTOMATIC zero-data-loss database migration COMPLETED!');
    console.log('DMS has successfully transitioned to PostgreSQL.');
    console.log('------------------------------------------------------------');
  } catch (err) {
    console.error('[AutoMigration] Automatic migration failed:', err);
    throw err;
  } finally {
    if (db) {
      db.close();
    }
  }
}
