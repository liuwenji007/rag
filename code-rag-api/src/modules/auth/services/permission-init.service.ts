import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class PermissionInitService implements OnModuleInit {
  private readonly logger = new Logger(PermissionInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializePermissions();
    await this.initializeRolePermissions();
  }

  /**
   * 初始化默认权限
   */
  private async initializePermissions() {
    const defaultPermissions = [
      {
        code: 'datasource:manage',
        name: '数据源管理',
        description: '管理数据源配置、同步任务',
        category: 'datasource',
      },
      {
        code: 'document:upload',
        name: '文档上传',
        description: '上传文档到知识库',
        category: 'document',
      },
      {
        code: 'document:prd:manage',
        name: 'PRD 管理',
        description: '管理 PRD 文档',
        category: 'document',
      },
      {
        code: 'document:design:manage',
        name: '设计稿管理',
        description: '管理设计稿资源',
        category: 'document',
      },
      {
        code: 'ui:requirement:extract',
        name: 'UI 需求提炼',
        description: '从 PRD 中提炼 UI 需求',
        category: 'ui',
      },
      {
        code: 'search:execute',
        name: '检索',
        description: '执行知识库检索',
        category: 'search',
      },
      {
        code: 'search:history:view',
        name: '检索历史查看',
        description: '查看检索历史记录',
        category: 'search',
      },
      {
        code: 'diff:analysis',
        name: '差异分析',
        description: '执行需求差异分析',
        category: 'diff',
      },
      {
        code: 'content:review',
        name: '内容审核',
        description: '审核用户上传的内容',
        category: 'review',
      },
      {
        code: 'permission:manage',
        name: '权限管理',
        description: '管理角色权限和用户分配',
        category: 'permission',
      },
    ];

    for (const permData of defaultPermissions) {
      try {
        await this.prisma.permission.upsert({
          where: { code: permData.code },
          update: {
            name: permData.name,
            description: permData.description,
            category: permData.category,
          },
          create: permData,
        });
        this.logger.log(`Permission ${permData.code} initialized`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize permission ${permData.code}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * 初始化默认角色权限
   */
  private async initializeRolePermissions() {
    const rolePermissions = {
      admin: [
        'datasource:manage',
        'document:upload',
        'document:prd:manage',
        'document:design:manage',
        'ui:requirement:extract',
        'search:execute',
        'search:history:view',
        'diff:analysis',
        'content:review',
        'permission:manage',
      ],
      product: [
        'document:upload',
        'document:prd:manage',
        'search:execute',
      ],
      ui: [
        'document:upload',
        'document:design:manage',
        'ui:requirement:extract',
        'search:execute',
      ],
      developer: [
        'search:execute',
        'search:history:view',
        'diff:analysis',
      ],
    };

    for (const [roleName, permissionCodes] of Object.entries(rolePermissions)) {
      try {
        const role = await this.prisma.role.findUnique({
          where: { name: roleName },
        });

        if (!role) {
          this.logger.warn(`Role ${roleName} not found, skipping permission initialization`);
          continue;
        }

        // 获取所有权限 ID
        const permissions = await this.prisma.permission.findMany({
          where: {
            code: {
              in: permissionCodes,
            },
          },
        });

        // 删除现有权限关联
        await this.prisma.rolePermission.deleteMany({
          where: { roleId: role.id },
        });

        // 创建新的权限关联
        if (permissions.length > 0) {
          await this.prisma.rolePermission.createMany({
            data: permissions.map((perm) => ({
              roleId: role.id,
              permissionId: perm.id,
            })),
            skipDuplicates: true,
          });
        }

        this.logger.log(`Role permissions initialized for ${roleName}`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize permissions for role ${roleName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
}

