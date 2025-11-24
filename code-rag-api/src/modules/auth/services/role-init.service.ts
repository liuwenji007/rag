import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RoleInitService implements OnModuleInit {
  private readonly logger = new Logger(RoleInitService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeRoles();
  }

  /**
   * 初始化默认角色
   */
  private async initializeRoles() {
    const defaultRoles = [
      {
        name: 'admin',
        description: '管理员，拥有所有权限',
      },
      {
        name: 'product',
        description: '产品经理，可管理 PRD、查看检索',
      },
      {
        name: 'ui',
        description: 'UI 设计师，可管理设计稿、提炼 UI 需求、查看检索',
      },
      {
        name: 'developer',
        description: '开发者，可执行检索、差异分析、查看检索历史',
      },
    ];

    for (const roleData of defaultRoles) {
      try {
        await this.prisma.role.upsert({
          where: { name: roleData.name },
          update: {
            description: roleData.description,
          },
          create: roleData,
        });
        this.logger.log(`Role ${roleData.name} initialized`);
      } catch (error) {
        this.logger.error(
          `Failed to initialize role ${roleData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }
}

