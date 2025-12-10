import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuditLog, Prisma } from '../../../generated/prisma/client';

export interface LogActionInput {
  action: string;
  entity: string;
  entityId?: number;
  userId?: number;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditQueryFilters {
  entity?: string;
  entityId?: number;
  action?: string;
  userId?: number;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(input: LogActionInput): Promise<AuditLog> {
    return this.prisma.client.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        userId: input.userId,
        oldValue: (input.oldValue ?? null) as Prisma.InputJsonValue,
        newValue: (input.newValue ?? null) as Prisma.InputJsonValue,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  async findAll(
    filters?: AuditQueryFilters,
  ): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(filters?.entity && { entity: filters.entity }),
      ...(filters?.entityId && { entityId: filters.entityId }),
      ...(filters?.action && { action: filters.action }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.from || filters?.to
        ? {
            createdAt: {
              ...(filters?.from && { gte: filters.from }),
              ...(filters?.to && { lte: filters.to }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.client.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.client.auditLog.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<AuditLog> {
    const audit = await this.prisma.client.auditLog.findUnique({
      where: { id },
    });

    if (!audit) {
      throw new NotFoundException(`AuditLog com ID ${id} não encontrado`);
    }

    return audit;
  }
}
