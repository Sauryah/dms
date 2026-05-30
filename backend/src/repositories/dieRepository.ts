import prisma from '../lib/prisma';

export class DieRepository {
  static async count(where?: any) {
    return prisma.die.count({ where });
  }

  static async findMany(options?: any) {
    return prisma.die.findMany(options);
  }

  static async findUnique(options: any) {
    return prisma.die.findUnique(options);
  }

  static async create(options: any) {
    return prisma.die.create(options);
  }

  static async update(options: any) {
    return prisma.die.update(options);
  }

  static async delete(options: any) {
    return prisma.die.delete(options);
  }
}
