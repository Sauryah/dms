import prisma from '../lib/prisma';

export class MachineRepository {
  static async count(where?: any) {
    return prisma.machine.count({ where });
  }

  static async findMany(options?: any) {
    return prisma.machine.findMany(options);
  }

  static async findUnique(options: any) {
    return prisma.machine.findUnique(options);
  }

  static async create(options: any) {
    return prisma.machine.create(options);
  }

  static async update(options: any) {
    return prisma.machine.update(options);
  }

  static async delete(options: any) {
    return prisma.machine.delete(options);
  }
}
