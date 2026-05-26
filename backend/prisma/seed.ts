import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const shouldResetDatabase = process.env.RESET_DATABASE === 'true';

async function ensureUser(username: string, password: string, role: 'ADMIN' | 'VIEWER') {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      username,
      passwordHash,
      role,
    },
  });
}

async function ensureDie(dieId: string, size: string, sizeValue: number, casing: string, details: string) {
  const existing = await prisma.die.findUnique({ where: { dieId } });
  if (existing) return existing;

  return prisma.die.create({
    data: { dieId, size, sizeValue, casing, details },
  });
}

async function ensureSet(name: string, description: string, dieIds: string[]) {
  const existing = await prisma.set.findUnique({ where: { name } });
  if (existing) return existing;

  return prisma.set.create({
    data: {
      name,
      description,
      dies: {
        connect: dieIds.map((id) => ({ id })),
      },
    },
  });
}

async function ensureMachine(name: string, location: string, setIds: string[]) {
  const existing = await prisma.machine.findUnique({ where: { name } });
  if (existing) return existing;

  return prisma.machine.create({
    data: {
      name,
      location,
      sets: {
        connect: setIds.map((id) => ({ id })),
      },
    },
  });
}

async function main() {
  if (shouldResetDatabase) {
    console.warn('RESET_DATABASE=true detected. Clearing existing seed-managed data.');
    await prisma.auditLog.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.die.deleteMany({});
    await prisma.set.deleteMany({});
    await prisma.machine.deleteMany({});
  }

  await ensureUser('admin', 'admin123', 'ADMIN');
  await ensureUser('viewer', 'viewer123', 'VIEWER');

  // Create Dies
  const die1 = await ensureDie('D-001', '10.000mm', 10.0, 'Steel', 'Main production die');
  const die2 = await ensureDie('D-002', '12.000mm', 12.0, 'Carbide', 'High precision');
  const die3 = await ensureDie('D-003', '8.000mm', 8.0, 'Steel', 'Backup die');

  // Create Sets
  const setA = await ensureSet('Set Alpha', 'Standard sizing set', [die1.id, die2.id]);
  const setB = await ensureSet('Set Beta', 'Small batch set', [die3.id]);

  // Create Machines
  await ensureMachine('Machine #101', 'Floor A - Zone 1', [setA.id]);
  await ensureMachine('Machine #202', 'Floor B - Zone 3', [setB.id]);

  console.log('Seed data ensured successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
