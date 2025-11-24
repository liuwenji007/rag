import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../../services/cache/cache.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly CACHE_TTL = 3600; // 1 小时

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * 获取权限矩阵
   */
  async getPermissionMatrix() {
    const cacheKey = 'matrix';
    const cached = await this.cache.get<ReturnType<typeof this.buildPermissionMatrix>>('permission', cacheKey);
    if (cached) {
      return cached;
    }

    const [roles, permissions, rolePermissions] = await Promise.all([
      this.prisma.role.findMany({
        orderBy: { name: 'asc' },
      }),
      this.prisma.permission.findMany({
        orderBy: { category: 'asc', code: 'asc' },
      }),
      this.prisma.rolePermission.findMany({
        include: {
          role: true,
          permission: true,
        },
      }),
    ]);

    // 构建权限矩阵
    const result = this.buildPermissionMatrix(roles, permissions, rolePermissions);

    // 缓存结果
    await this.cache.set('permission', cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * 构建权限矩阵（内部方法）
   */
  private buildPermissionMatrix(roles: any[], permissions: any[], rolePermissions: any[]) {
    const matrix = roles.map((role) => {
      const rolePerms = rolePermissions
        .filter((rp) => rp.roleId === role.id)
        .map((rp) => rp.permission.code);

      return {
        roleId: role.id,
        roleName: role.name,
        roleDescription: role.description,
        permissions: permissions.map((perm) => ({
          permissionId: perm.id,
          permissionCode: perm.code,
          permissionName: perm.name,
          permissionCategory: perm.category,
          granted: rolePerms.includes(perm.code),
        })),
      };
    });

    return {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      })),
      permissions: permissions.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
      })),
      matrix,
    };
  }

  /**
   * 更新角色权限
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
    changedBy: string,
  ) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    // 获取现有权限
    const existingPermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });

    const existingPermissionIds = existingPermissions.map((ep) => ep.permissionId);
    const newPermissionIds = permissionIds.filter((id) => !existingPermissionIds.includes(id));
    const removedPermissionIds = existingPermissionIds.filter((id) => !permissionIds.includes(id));

    // 删除权限
    if (removedPermissionIds.length > 0) {
      const removedPermissions = existingPermissions.filter((ep) =>
        removedPermissionIds.includes(ep.permissionId),
      );

      for (const rp of removedPermissions) {
        await this.prisma.rolePermission.delete({
          where: { id: rp.id },
        });

        // 记录变更日志
        await this.logPermissionChange({
          changedBy,
          changeType: 'role_permission_removed',
          targetType: 'role',
          targetId: roleId,
          permissionId: rp.permissionId,
          oldValue: { permissionCode: rp.permission.code },
          newValue: null,
          description: `移除角色 ${role.name} 的权限 ${rp.permission.code}`,
        });
      }
    }

    // 添加权限
    if (newPermissionIds.length > 0) {
      const newPermissions = await this.prisma.permission.findMany({
        where: { id: { in: newPermissionIds } },
      });

      for (const perm of newPermissions) {
        await this.prisma.rolePermission.create({
          data: {
            roleId,
            permissionId: perm.id,
          },
        });

        // 记录变更日志
        await this.logPermissionChange({
          changedBy,
          changeType: 'role_permission_added',
          targetType: 'role',
          targetId: roleId,
          permissionId: perm.id,
          oldValue: null,
          newValue: { permissionCode: perm.code },
          description: `为角色 ${role.name} 添加权限 ${perm.code}`,
        });
      }
    }

    // 清除缓存
    await this.cache.delete('permission', 'matrix');
    await this.cache.delete('permission', `role:${roleId}`);

    return { success: true };
  }

  /**
   * 获取用户列表（带角色）
   */
  async getUsersWithRoles(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
        })),
        createdAt: user.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 更新用户角色
   */
  async updateUserRoles(
    userId: string,
    roleIds: string[],
    changedBy: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // 获取现有角色
    const existingRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    const existingRoleIds = existingRoles.map((er) => er.roleId);
    const newRoleIds = roleIds.filter((id) => !existingRoleIds.includes(id));
    const removedRoleIds = existingRoleIds.filter((id) => !roleIds.includes(id));

    // 删除角色
    if (removedRoleIds.length > 0) {
      const removedRoles = existingRoles.filter((er) => removedRoleIds.includes(er.roleId));

      for (const ur of removedRoles) {
        await this.prisma.userRole.delete({
          where: { id: ur.id },
        });

        // 记录变更日志
        await this.logPermissionChange({
          changedBy,
          changeType: 'user_role_removed',
          targetType: 'user',
          targetId: userId,
          permissionId: null,
          oldValue: { roleId: ur.roleId, roleName: ur.role.name },
          newValue: null,
          description: `移除用户 ${user.email} 的角色 ${ur.role.name}`,
        });
      }
    }

    // 添加角色
    if (newRoleIds.length > 0) {
      const newRoles = await this.prisma.role.findMany({
        where: { id: { in: newRoleIds } },
      });

      for (const role of newRoles) {
        await this.prisma.userRole.create({
          data: {
            userId,
            roleId: role.id,
          },
        });

        // 记录变更日志
        await this.logPermissionChange({
          changedBy,
          changeType: 'user_role_added',
          targetType: 'user',
          targetId: userId,
          permissionId: null,
          oldValue: null,
          newValue: { roleId: role.id, roleName: role.name },
          description: `为用户 ${user.email} 添加角色 ${role.name}`,
        });
      }
    }

    // 清除用户权限缓存
    await this.cache.delete('permission', `user:${userId}`);

    return { success: true };
  }

  /**
   * 批量操作
   */
  async batchOperation(
    operation: 'assign_roles' | 'update_permissions',
    targetIds: string[],
    data: any,
    changedBy: string,
  ) {
    const results = [];

    if (operation === 'assign_roles') {
      // 批量分配角色
      for (const userId of targetIds) {
        try {
          await this.updateUserRoles(userId, data.roleIds, changedBy);
          results.push({ id: userId, success: true });
        } catch (error) {
          results.push({
            id: userId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } else if (operation === 'update_permissions') {
      // 批量更新权限
      for (const roleId of targetIds) {
        try {
          await this.updateRolePermissions(roleId, data.permissionIds, changedBy);
          results.push({ id: roleId, success: true });
        } catch (error) {
          results.push({
            id: roleId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return {
      success: results.every((r) => r.success),
      results,
    };
  }

  /**
   * 获取权限变更日志
   */
  async getPermissionChangeLog(
    page = 1,
    limit = 20,
    targetType?: string,
    targetId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (targetType) {
      where.targetType = targetType;
    }
    if (targetId) {
      where.targetId = targetId;
    }

    const [logs, total] = await Promise.all([
      this.prisma.permissionChangeLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          changedByUser: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.permissionChangeLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        changedBy: {
          id: log.changedByUser?.id,
          email: log.changedByUser?.email,
          name: log.changedByUser?.name,
        },
        changeType: log.changeType,
        targetType: log.targetType,
        targetId: log.targetId,
        permissionId: log.permissionId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        description: log.description,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 记录权限变更日志
   */
  private async logPermissionChange(data: {
    changedBy: string;
    changeType: string;
    targetType: string;
    targetId: string;
    permissionId: string | null;
    oldValue: any;
    newValue: any;
    description?: string;
  }) {
    try {
      await this.prisma.permissionChangeLog.create({
        data: {
          changedBy: data.changedBy,
          changeType: data.changeType,
          targetType: data.targetType,
          targetId: data.targetId,
          permissionId: data.permissionId,
          oldValue: data.oldValue as any,
          newValue: data.newValue as any,
          description: data.description,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to log permission change: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

