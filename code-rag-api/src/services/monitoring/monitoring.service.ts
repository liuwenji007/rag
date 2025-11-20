import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DatasourcesService } from '../../modules/datasources/datasources.service';

export interface DataSourceStatus {
  id: string;
  name: string;
  type: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'running' | null;
  documentCount: number;
  codeFileCount: number;
  recentErrors: Array<{ time: Date; message: string }>;
  health: 'healthy' | 'warning' | 'error';
  suggestions: string[];
}

export interface DataSourceStats {
  documentCount: number;
  codeFileCount: number;
  totalSize: number; // 总大小（字节）
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'running' | null;
  syncHistoryCount: number;
  successRate: number; // 成功率（0-100）
}

export interface DataSourceHealth {
  health: 'healthy' | 'warning' | 'error';
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastSyncAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | 'running' | null;
  recentErrors: Array<{ time: Date; message: string }>;
  suggestions: string[];
}

export interface MonitoringDashboard {
  total: number;
  healthy: number;
  warning: number;
  error: number;
  dataSources: DataSourceStatus[];
  recentActivity: Array<{
    datasourceId: string;
    datasourceName: string;
    action: string;
    time: Date;
    status: string;
  }>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly datasourcesService: DatasourcesService,
  ) {}

  /**
   * 获取数据源状态
   */
  async getDataSourceStatus(datasourceId: string): Promise<DataSourceStatus> {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
      include: {
        documents: true,
        syncHistories: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!dataSource) {
      throw new Error(`DataSource with ID ${datasourceId} not found`);
    }

    // 检查连接状态
    const connectionStatus = await this.checkConnectionStatus(dataSource.id);

    // 获取最后同步信息
    const lastSync = dataSource.syncHistories[0] || null;
    const lastSyncAt = dataSource.lastSyncAt;
    const lastSyncStatus = lastSync
      ? (lastSync.status as 'success' | 'failed' | 'running' | null)
      : null;

    // 统计文档数量
    const documentCount = dataSource.documents.length;

    // 统计代码文件数量
    const codeFileCount = dataSource.documents.filter(
      (doc) => doc.contentType === 'code',
    ).length;

    // 获取最近错误
    const recentErrors = dataSource.syncHistories
      .filter((history) => history.status === 'failed')
      .slice(0, 5)
      .map((history) => ({
        time: history.createdAt,
        message: history.errorMessage || 'Unknown error',
      }));

    // 评估健康度
    const health = this.evaluateHealth(
      connectionStatus,
      lastSyncAt,
      lastSyncStatus,
      recentErrors,
    );

    // 生成建议
    const suggestions = this.generateSuggestions(
      health,
      connectionStatus,
      lastSyncAt,
      lastSyncStatus,
      recentErrors,
    );

    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      connectionStatus,
      lastSyncAt,
      lastSyncStatus,
      documentCount,
      codeFileCount,
      recentErrors,
      health,
      suggestions,
    };
  }

  /**
   * 获取数据源统计信息
   */
  async getDataSourceStats(datasourceId: string): Promise<DataSourceStats> {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
      include: {
        documents: true,
        syncHistories: true,
      },
    });

    if (!dataSource) {
      throw new Error(`DataSource with ID ${datasourceId} not found`);
    }

    const documentCount = dataSource.documents.length;
    const codeFileCount = dataSource.documents.filter(
      (doc) => doc.contentType === 'code',
    ).length;

    // 计算总大小（估算）
    const totalSize = dataSource.documents.reduce((sum, doc) => {
      return sum + (doc.content?.length || 0);
    }, 0);

    const lastSyncAt = dataSource.lastSyncAt;
    const lastSync = dataSource.syncHistories[0] || null;
    const lastSyncStatus = lastSync
      ? (lastSync.status as 'success' | 'failed' | 'running' | null)
      : null;

    const syncHistoryCount = dataSource.syncHistories.length;

    // 计算成功率（最近 30 条记录）
    const recentHistories = dataSource.syncHistories.slice(0, 30);
    const successCount = recentHistories.filter(
      (h) => h.status === 'success',
    ).length;
    const successRate =
      recentHistories.length > 0
        ? Math.round((successCount / recentHistories.length) * 100)
        : 100;

    return {
      documentCount,
      codeFileCount,
      totalSize,
      lastSyncAt,
      lastSyncStatus,
      syncHistoryCount,
      successRate,
    };
  }

  /**
   * 获取数据源健康度
   */
  async getDataSourceHealth(datasourceId: string): Promise<DataSourceHealth> {
    const dataSource = await this.prisma.dataSource.findUnique({
      where: { id: datasourceId },
      include: {
        syncHistories: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!dataSource) {
      throw new Error(`DataSource with ID ${datasourceId} not found`);
    }

    const connectionStatus = await this.checkConnectionStatus(dataSource.id);
    const lastSyncAt = dataSource.lastSyncAt;
    const lastSync = dataSource.syncHistories[0] || null;
    const lastSyncStatus = lastSync
      ? (lastSync.status as 'success' | 'failed' | 'running' | null)
      : null;

    const recentErrors = dataSource.syncHistories
      .filter((history) => history.status === 'failed')
      .slice(0, 5)
      .map((history) => ({
        time: history.createdAt,
        message: history.errorMessage || 'Unknown error',
      }));

    const health = this.evaluateHealth(
      connectionStatus,
      lastSyncAt,
      lastSyncStatus,
      recentErrors,
    );

    const suggestions = this.generateSuggestions(
      health,
      connectionStatus,
      lastSyncAt,
      lastSyncStatus,
      recentErrors,
    );

    return {
      health,
      connectionStatus,
      lastSyncAt,
      lastSyncStatus,
      recentErrors,
      suggestions,
    };
  }

  /**
   * 获取监控看板数据
   */
  async getDashboard(): Promise<MonitoringDashboard> {
    const dataSources = await this.prisma.dataSource.findMany({
      include: {
        documents: true,
        syncHistories: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const dataSourceStatuses: DataSourceStatus[] = [];

    for (const dataSource of dataSources) {
      try {
        const status = await this.getDataSourceStatus(dataSource.id);
        dataSourceStatuses.push(status);
      } catch (error) {
        this.logger.error(
          `Failed to get status for datasource ${dataSource.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    const healthy = dataSourceStatuses.filter((s) => s.health === 'healthy')
      .length;
    const warning = dataSourceStatuses.filter((s) => s.health === 'warning')
      .length;
    const error = dataSourceStatuses.filter((s) => s.health === 'error').length;

    // 获取最近活动（最近 20 条同步历史）
    const recentHistories = await this.prisma.syncHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        dataSource: true,
      },
    });

    const recentActivity = recentHistories.map((history) => ({
      datasourceId: history.datasourceId,
      datasourceName: history.dataSource.name,
      action: 'sync',
      time: history.createdAt,
      status: history.status,
    }));

    return {
      total: dataSources.length,
      healthy,
      warning,
      error,
      dataSources: dataSourceStatuses,
      recentActivity,
    };
  }

  /**
   * 检查连接状态
   */
  private async checkConnectionStatus(
    datasourceId: string,
  ): Promise<'connected' | 'disconnected' | 'error'> {
    try {
      // 获取数据源配置
      const dataSource = await this.prisma.dataSource.findUnique({
        where: { id: datasourceId },
      });

      if (!dataSource || !dataSource.enabled) {
        return 'disconnected';
      }

      // 使用 testConnection 方法测试连接
      const testDto = {
        type: dataSource.type,
        config: dataSource.config,
        encryptedConfig: dataSource.encryptedConfig,
      };

      const result = await this.datasourcesService.testConnection(testDto as never);
      return result.success ? 'connected' : 'error';
    } catch (error) {
      this.logger.error(
        `Connection check failed for datasource ${datasourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return 'error';
    }
  }

  /**
   * 评估健康度
   */
  private evaluateHealth(
    connectionStatus: 'connected' | 'disconnected' | 'error',
    lastSyncAt: Date | null,
    lastSyncStatus: 'success' | 'failed' | 'running' | null,
    recentErrors: Array<{ time: Date; message: string }>,
  ): 'healthy' | 'warning' | 'error' {
    // 连接失败 -> 异常
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      return 'error';
    }

    // 最近同步持续失败 -> 异常
    if (
      lastSyncStatus === 'failed' &&
      recentErrors.length >= 3 &&
      recentErrors[0].time.getTime() >
        Date.now() - 24 * 60 * 60 * 1000 // 24 小时内
    ) {
      return 'error';
    }

    // 超过 24 小时未同步 -> 警告
    if (
      !lastSyncAt ||
      lastSyncAt.getTime() < Date.now() - 24 * 60 * 60 * 1000
    ) {
      return 'warning';
    }

    // 有最近错误但已恢复 -> 警告
    if (recentErrors.length > 0 && lastSyncStatus === 'success') {
      return 'warning';
    }

    // 其他情况 -> 正常
    return 'healthy';
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    health: 'healthy' | 'warning' | 'error',
    connectionStatus: 'connected' | 'disconnected' | 'error',
    lastSyncAt: Date | null,
    lastSyncStatus: 'success' | 'failed' | 'running' | null,
    recentErrors: Array<{ time: Date; message: string }>,
  ): string[] {
    const suggestions: string[] = [];

    if (health === 'error') {
      if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
        suggestions.push('数据源连接失败，请检查配置和网络连接');
        suggestions.push('尝试重新测试连接');
      } else if (lastSyncStatus === 'failed') {
        suggestions.push('最近同步持续失败，请检查错误日志');
        suggestions.push('尝试手动触发同步');
        if (recentErrors.length > 0) {
          suggestions.push(
            `最近错误: ${recentErrors[0].message.substring(0, 100)}`,
          );
        }
      }
    } else if (health === 'warning') {
      if (
        !lastSyncAt ||
        lastSyncAt.getTime() < Date.now() - 24 * 60 * 60 * 1000
      ) {
        suggestions.push('数据源超过 24 小时未同步，建议检查同步计划配置');
        suggestions.push('尝试手动触发同步');
      } else if (recentErrors.length > 0) {
        suggestions.push('数据源有最近的错误记录，但已恢复');
        suggestions.push('建议监控后续同步状态');
      }
    } else {
      suggestions.push('数据源状态正常');
    }

    return suggestions;
  }
}

