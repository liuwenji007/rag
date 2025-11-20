import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../services/encryption/encryption.service';
import { FeishuService } from '../../services/feishu/feishu.service';
import { GitLabService } from '../../services/gitlab/gitlab.service';
import { DatabaseService } from '../../services/database/database.service';
import { SchedulerService } from '../../services/scheduler/scheduler.service';
import { CreateDataSourceDto } from './dto/create-datasource.dto';
import { UpdateDataSourceDto } from './dto/update-datasource.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import {
  DataSourceType,
  FeishuDataSourceConfig,
  GitLabDataSourceConfig,
  DatabaseDataSourceConfig,
} from './interfaces/datasource-config.interface';
import axios from 'axios';

@Injectable()
export class DatasourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly feishuService: FeishuService,
    private readonly gitLabService: GitLabService,
    private readonly databaseService: DatabaseService,
    private readonly schedulerService: SchedulerService,
  ) {}

  /**
   * 创建数据源
   */
  async create(createDto: CreateDataSourceDto) {
    // 分离敏感和非敏感配置
    const { publicConfig, encryptedConfig } = this.separateConfigFields(
      createDto.type,
      createDto.config,
    );

    const dataSource = await this.prisma.dataSource.create({
      data: {
        name: createDto.name,
        type: createDto.type,
        config: publicConfig as object,
        encryptedConfig: encryptedConfig || null,
        enabled: createDto.enabled ?? true,
        status: 'INACTIVE',
        description: createDto.description,
        syncSchedule: createDto.syncSchedule,
      },
    });

    // 如果启用了且配置了同步计划，注册定时任务
    if (dataSource.enabled && dataSource.syncSchedule) {
      try {
        this.schedulerService.registerScheduledTask(
          dataSource.id,
          dataSource.syncSchedule,
        );
      } catch (error) {
        // 定时任务注册失败不影响数据源创建
        console.error(
          `Failed to register scheduled task for datasource ${dataSource.id}:`,
          error,
        );
      }
    }

    return dataSource;
  }

  /**
   * 获取所有数据源
   */
  async findAll() {
    const dataSources = await this.prisma.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 移除敏感信息（不返回给前端）
    return dataSources.map(
      (ds: {
        id: string;
        name: string;
        type: string;
        status: string;
        config: unknown;
        encryptedConfig?: string | null;
        enabled: boolean;
        createdAt: Date;
        updatedAt: Date;
        lastSyncAt: Date | null;
        description?: string | null;
      }) => this.removeSensitiveFields(ds),
    );
  }

  /**
   * 根据 ID 获取数据源
   */
  async findOne(id: string) {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id },
    });

    if (!dataSource) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    // 移除敏感信息
    return this.removeSensitiveFields(dataSource);
  }

  /**
   * 更新数据源
   */
  async update(id: string, updateDto: UpdateDataSourceDto) {
    const existing = await this.prisma.dataSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    const updateData: {
      name?: string;
      type?: 'FEISHU' | 'GITLAB' | 'DATABASE';
      config?: object;
      encryptedConfig?: string | null;
      enabled?: boolean;
      description?: string | null;
      syncSchedule?: string | null;
    } = {};

    if (updateDto.name) {
      updateData.name = updateDto.name;
    }

    if (updateDto.type) {
      updateData.type = updateDto.type;
    }

    if (updateDto.config) {
      const type = (updateDto.type || existing.type) as DataSourceType;
      const { publicConfig, encryptedConfig } = this.separateConfigFields(
        type,
        updateDto.config,
      );
      updateData.config = publicConfig as object;
      updateData.encryptedConfig = encryptedConfig || null;
    }

    if (updateDto.enabled !== undefined) {
      updateData.enabled = updateDto.enabled;
    }

    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description;
    }

    if (updateDto.syncSchedule !== undefined) {
      updateData.syncSchedule = updateDto.syncSchedule;
    }

    const updated = await this.prisma.dataSource.update({
      where: { id },
      data: updateData,
    });

    // 更新定时任务
    if (updated.enabled && updated.syncSchedule) {
      try {
        this.schedulerService.updateScheduledTask(
          updated.id,
          updated.syncSchedule,
        );
      } catch (error) {
        console.error(
          `Failed to update scheduled task for datasource ${updated.id}:`,
          error,
        );
      }
    } else {
      // 如果禁用或没有同步计划，停止定时任务
      this.schedulerService.stopScheduledTask(updated.id);
    }

    return updated;
  }

  /**
   * 删除数据源
   */
  async remove(id: string) {
    const existing = await this.prisma.dataSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    await this.prisma.dataSource.delete({
      where: { id },
    });

    return { message: 'DataSource deleted successfully' };
  }

  /**
   * 启用数据源
   */
  async enable(id: string) {
    const existing = await this.prisma.dataSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    const updated = await this.prisma.dataSource.update({
      where: { id },
      data: { enabled: true, status: 'ACTIVE' },
    });

    // 如果配置了同步计划，注册定时任务
    if (updated.syncSchedule) {
      try {
        this.schedulerService.registerScheduledTask(
          updated.id,
          updated.syncSchedule,
        );
      } catch (error) {
        console.error(
          `Failed to register scheduled task for datasource ${updated.id}:`,
          error,
        );
      }
    }

    return updated;
  }

  /**
   * 禁用数据源
   */
  async disable(id: string) {
    const existing = await this.prisma.dataSource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`DataSource with ID ${id} not found`);
    }

    // 停止定时任务
    this.schedulerService.stopScheduledTask(id);

    return this.prisma.dataSource.update({
      where: { id },
      data: { enabled: false, status: 'INACTIVE' },
    });
  }

  /**
   * 测试连接（支持从数据库读取或直接传入配置）
   */
  async testConnection(
    testDto: TestConnectionDto & {
      encryptedConfig?: string;
      datasourceId?: string;
    },
  ) {
    try {
      let config: unknown;
      let type: DataSourceType;

      // 如果提供了 datasourceId，从数据库读取配置并解密
      if (testDto.datasourceId) {
        const dataSource = await this.prisma.dataSource.findUnique({
          where: { id: testDto.datasourceId },
        });

        if (!dataSource) {
          throw new NotFoundException(
            `DataSource with ID ${testDto.datasourceId} not found`,
          );
        }

        type = dataSource.type as DataSourceType;

        if (dataSource.encryptedConfig) {
          config = this.decryptConfigFields(
            type,
            dataSource.config as unknown as Record<string, unknown>,
            dataSource.encryptedConfig,
          );
        } else {
          config = dataSource.config;
        }
      } else {
        // 使用传入的配置
        type = testDto.type;
        config = testDto.config;

        // 如果直接提供了加密配置，解密它
        if (testDto.encryptedConfig) {
          config = this.decryptConfigFields(
            type,
            testDto.config as unknown as Record<string, unknown>,
            testDto.encryptedConfig,
          );
        }
      }

      switch (type) {
        case 'FEISHU':
          return await this.testFeishuConnection(
            config as FeishuDataSourceConfig,
          );
        case 'GITLAB':
          return await this.testGitLabConnection(
            config as GitLabDataSourceConfig,
          );
        case 'DATABASE':
          return await this.databaseService.testConnection(
            config as DatabaseDataSourceConfig,
          );
        default:
          throw new BadRequestException(
            `Unsupported data source type: ${type}`,
          );
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * 测试飞书连接
   */
  private async testFeishuConnection(config: FeishuDataSourceConfig) {
    return await this.feishuService.testConnection(config);
  }

  /**
   * 测试 GitLab 连接
   */
  private async testGitLabConnection(config: GitLabDataSourceConfig) {
    return await this.gitLabService.testConnection(config);
  }

  /**
   * 分离敏感和非敏感配置字段
   */
  private separateConfigFields(
    type: DataSourceType,
    config: unknown,
  ): { publicConfig: unknown; encryptedConfig: string | null } {
    const configObj = config as Record<string, unknown>;

    switch (type) {
      case 'FEISHU': {
        const feishuConfig = configObj as unknown as FeishuDataSourceConfig;
        const { appSecret, ...publicConfig } = feishuConfig;
        return {
          publicConfig: {
            ...publicConfig,
            appSecret: '[ENCRYPTED]', // 占位符，表示已加密
          },
          encryptedConfig: this.encryption.encrypt(appSecret),
        };
      }
      case 'GITLAB': {
        const gitlabConfig = configObj as unknown as GitLabDataSourceConfig;
        const { accessToken, ...publicConfig } = gitlabConfig;
        return {
          publicConfig: {
            ...publicConfig,
            accessToken: '[ENCRYPTED]', // 占位符，表示已加密
          },
          encryptedConfig: this.encryption.encrypt(accessToken),
        };
      }
      case 'DATABASE': {
        const dbConfig = configObj as unknown as DatabaseDataSourceConfig;
        const { connectionString, ...publicConfig } = dbConfig;
        return {
          publicConfig: {
            ...publicConfig,
            connectionString: '[ENCRYPTED]', // 占位符，表示已加密
          },
          encryptedConfig: this.encryption.encrypt(connectionString),
        };
      }
      default:
        return {
          publicConfig: config,
          encryptedConfig: null,
        };
    }
  }

  /**
   * 解密配置字段（用于测试连接）
   */
  private decryptConfigFields(
    type: DataSourceType,
    publicConfig: Record<string, unknown>,
    encryptedConfig: string,
  ): unknown {
    const decryptedValue = this.encryption.decrypt(encryptedConfig);

    switch (type) {
      case 'FEISHU': {
        return {
          ...publicConfig,
          appSecret: decryptedValue,
        } as FeishuDataSourceConfig;
      }
      case 'GITLAB': {
        return {
          ...publicConfig,
          accessToken: decryptedValue,
        } as GitLabDataSourceConfig;
      }
      case 'DATABASE': {
        return {
          ...publicConfig,
          connectionString: decryptedValue,
        } as DatabaseDataSourceConfig;
      }
      default:
        return publicConfig;
    }
  }

  /**
   * 移除敏感字段（不返回给前端）
   */
  private removeSensitiveFields(dataSource: {
    id: string;
    name: string;
    type: string;
    status: string;
    config: unknown;
    encryptedConfig?: string | null;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastSyncAt: Date | null;
    description?: string | null;
  }) {
    const config = dataSource.config as Record<string, unknown>;
    const sanitizedConfig = { ...config };

    // 移除敏感字段占位符
    if (
      dataSource.type === 'FEISHU' &&
      sanitizedConfig.appSecret === '[ENCRYPTED]'
    ) {
      delete sanitizedConfig.appSecret;
    }
    if (
      dataSource.type === 'GITLAB' &&
      sanitizedConfig.accessToken === '[ENCRYPTED]'
    ) {
      delete sanitizedConfig.accessToken;
    }
    if (
      dataSource.type === 'DATABASE' &&
      sanitizedConfig.connectionString === '[ENCRYPTED]'
    ) {
      delete sanitizedConfig.connectionString;
    }

    const result: Record<string, unknown> = {
      ...dataSource,
      config: sanitizedConfig,
    };

    // 不返回 encryptedConfig 字段
    delete result.encryptedConfig;

    return result;
  }
}
