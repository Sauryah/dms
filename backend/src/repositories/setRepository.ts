import prisma from '../lib/prisma';

export class SetRepository {
  static async count(where?: any) {
    return prisma.set.count({ where });
  }

  static async findMany(options?: any) {
    return prisma.set.findMany(options);
  }

  static async findUnique(options: any) {
    return prisma.set.findUnique(options);
  }

  static async create(options: any) {
    return prisma.set.create(options);
  }

  static async update(options: any) {
    return prisma.set.update(options);
  }

  static async delete(options: any) {
    return prisma.set.delete(options);
  }
}
