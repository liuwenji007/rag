import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export enum ActionType {
  SEARCH = 'search',
  DOCUMENT_UPLOAD = 'document_upload',
  DOCUMENT_DELETE = 'document_delete',
  DOCUMENT_UPDATE = 'document_update',
  PERMISSION_CHANGE = 'permission_change',
  ROLE_ASSIGNMENT = 'role_assignment',
  DATASOURCE_CREATE = 'datasource_create',
  DATASOURCE_UPDATE = 'datasource_update',
  DATASOURCE_DELETE = 'datasource_delete',
  DATASOURCE_SYNC = 'datasource_sync',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
}

export enum ResourceType {
  DOCUMENT = 'document',
  DATASOURCE = 'datasource',
  PERMISSION = 'permission',
  ROLE = 'role',
  USER = 'user',
  SEARCH = 'search',
}

export interface CreateAuditLogDto {
  userId: string;
  actionType: ActionType;
  resourceType?: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建审计日志
   */
  async createAuditLog(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          actionType: dto.actionType,
          resourceType: dto.resourceType || null,
          resourceId: dto.resourceId || null,
          details: dto.details ? (dto.details as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: dto.ipAddress || null,
          userAgent: dto.userAgent || null,
        },
      });
    } catch (error) {
      // 审计日志记录失败不应该影响主流程
      this.logger.error(
        `Failed to create audit log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 查询审计日志
   */
  async getAuditLogs(
    page = 1,
    limit = 20,
    filters?: {
      userId?: string;
      actionType?: string;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.actionType) {
      where.actionType = filters.actionType;
    }

    if (filters?.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters?.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        userId: log.userId,
        user: {
          id: log.user.id,
          email: log.user.email,
          name: log.user.name,
        },
        actionType: log.actionType,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取审计日志统计
   */
  async getAuditLogStats(
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: Prisma.AuditLogWhereInput = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, byActionType, byResourceType, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['actionType'],
        where,
        _count: {
          id: true,
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['resourceType'],
        where,
        _count: {
          id: true,
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: {
          id: true,
        },
        _max: {
          createdAt: true,
        },
      }),
    ]);

    return {
      total,
      byActionType: byActionType.map((item) => ({
        actionType: item.actionType,
        count: item._count.id,
      })),
      byResourceType: byResourceType
        .filter((item) => item.resourceType)
        .map((item) => ({
          resourceType: item.resourceType,
          count: item._count.id,
        })),
      byUser: byUser.map((item) => ({
        userId: item.userId,
        count: item._count.id,
        lastActionAt: item._max.createdAt,
      })),
      timeRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }

  /**
   * 清理过期日志
   */
  async cleanupExpiredLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired audit logs`);
    return result.count;
  }
}

