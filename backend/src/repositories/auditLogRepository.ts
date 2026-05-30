import prisma from '../lib/prisma';

export class AuditLogRepository {
  static async count(where?: any) {
    return prisma.auditLog.count({ where });
  }

  static async findMany(options?: any) {
    return prisma.auditLog.findMany(options);
  }

  static async findUnique(options: any) {
    return prisma.auditLog.findUnique(options);
  }

  static async create(options: any) {
    return prisma.auditLog.create(options);
  }
}
