import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface DatasourceUsageStatistics {
  // 各数据源检索次数
  searchCounts: {
    byType: Array<{ type: string; count: number; percentage: number }>; // 按类型统计
    byDatasource: Array<{ datasourceId: string; datasourceName: string; type: string; count: number }>; // 按数据源统计
    trend: Array<{ date: string; feishu: number; gitlab: number; database: number }>; // 趋势
  };

  // 各数据源命中率
  hitRate: {
    byType: Array<{ type: string; rate: number; total: number; hits: number }>; // 按类型
    byDatasource: Array<{ datasourceId: string; datasourceName: string; type: string; rate: number }>; // 按数据源
  };

  // 数据源数据量统计
  dataVolume: {
    byType: Array<{ type: string; documentCount: number; codeFileCount: number }>; // 按类型
    byDatasource: Array<{ datasourceId: string; datasourceName: string; type: string; documentCount: number; codeFileCount: number }>; // 按数据源
    trend: Array<{ date: string; totalDocuments: number }>; // 数据量趋势
  };

  // 数据源同步情况
  syncStatus: {
    byDatasource: Array<{
      datasourceId: string;
      datasourceName: string;
      type: string;
      syncCount: number;
      successCount: number;
      failedCount: number;
      successRate: number;
      avgDuration: number; // 平均耗时（毫秒）
      lastSyncAt: Date | null;
    }>;
  };

  // 数据源健康度
  health: {
    byDatasource: Array<{
      datasourceId: string;
      datasourceName: string;
      type: string;
      status: string;
      healthScore: number; // 健康度分数（0-100）
      connectionStatus: string;
      errorRate: number;
      lastSyncAt: Date | null;
    }>;
  };
}

@Injectable()
export class DatasourceUsageService {
  private readonly logger = new Logger(DatasourceUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取数据源使用情况统计
   */
  async getDatasourceUsageStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<DatasourceUsageStatistics> {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || now;

    // 并行获取所有统计数据
    const [searchCounts, hitRate, dataVolume, syncStatus, health] =
      await Promise.all([
        this.getSearchCounts(start, end),
        this.getHitRate(start, end),
        this.getDataVolume(start, end),
        this.getSyncStatus(),
        this.getHealth(),
      ]);

    return {
      searchCounts,
      hitRate,
      dataVolume,
      syncStatus,
      health,
    };
  }

  /**
   * 获取各数据源检索次数
   * 注意：由于 SearchHistory 表中没有直接存储数据源信息，我们通过 SearchResultFeedback 关联 Document 来统计
   */
  private async getSearchCounts(startDate: Date, endDate: Date) {
    // 从 SearchResultFeedback 关联 Document 和 DataSource 统计
    const feedbacksWithDocs = await this.prisma.searchResultFeedback.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        documentId: { not: null },
      },
      include: {
        searchHistory: true,
      },
    });

    // 获取所有相关的文档 ID
    const documentIds = feedbacksWithDocs
      .map((f) => f.documentId)
      .filter((id): id is string => id !== null);

    // 获取文档及其数据源信息
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
        datasourceId: { not: null },
      },
      include: {
        dataSource: true,
      },
    });

    // 统计按类型
    const typeCountMap = new Map<string, number>();
    documents.forEach((doc) => {
      if (doc.dataSource) {
        const type = doc.dataSource.type;
        typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
      }
    });

    const total = Array.from(typeCountMap.values()).reduce((a, b) => a + b, 0);
    const byType = Array.from(typeCountMap.entries()).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));

    // 统计按数据源
    const datasourceCountMap = new Map<
      string,
      { name: string; type: string; count: number }
    >();
    documents.forEach((doc) => {
      if (doc.dataSource) {
        const key = doc.dataSource.id;
        const existing = datasourceCountMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          datasourceCountMap.set(key, {
            name: doc.dataSource.name,
            type: doc.dataSource.type,
            count: 1,
          });
        }
      }
    });

    const byDatasource = Array.from(datasourceCountMap.entries()).map(
      ([datasourceId, info]) => ({
        datasourceId,
        datasourceName: info.name,
        type: info.type,
        count: info.count,
      }),
    );

    // 趋势（简化处理，按天统计）
    const trend: Array<{ date: string; feishu: number; gitlab: number; database: number }> = [];
    // TODO: 实现更详细的趋势统计

    return {
      byType,
      byDatasource,
      trend,
    };
  }

  /**
   * 获取各数据源命中率
   */
  private async getHitRate(startDate: Date, endDate: Date) {
    // 从 SearchResultFeedback 中统计被采纳的结果
    const adoptedFeedbacks = await this.prisma.searchResultFeedback.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        adoptionStatus: 'adopted',
        documentId: { not: null },
      },
    });

    const documentIds = adoptedFeedbacks
      .map((f) => f.documentId)
      .filter((id): id is string => id !== null);

    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: documentIds },
        datasourceId: { not: null },
      },
      include: {
        dataSource: true,
      },
    });

    // 统计按类型
    const typeCountMap = new Map<string, number>();
    documents.forEach((doc) => {
      if (doc.dataSource) {
        const type = doc.dataSource.type;
        typeCountMap.set(type, (typeCountMap.get(type) || 0) + 1);
      }
    });

    // 获取总反馈数（用于计算命中率）
    const totalFeedbacks = await this.prisma.searchResultFeedback.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        documentId: { not: null },
      },
    });

    const byType = Array.from(typeCountMap.entries()).map(([type, hits]) => ({
      type,
      rate: totalFeedbacks > 0 ? (hits / totalFeedbacks) * 100 : 0,
      total: totalFeedbacks,
      hits,
    }));

    // 统计按数据源
    const datasourceCountMap = new Map<
      string,
      { name: string; type: string; count: number }
    >();
    documents.forEach((doc) => {
      if (doc.dataSource) {
        const key = doc.dataSource.id;
        const existing = datasourceCountMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          datasourceCountMap.set(key, {
            name: doc.dataSource.name,
            type: doc.dataSource.type,
            count: 1,
          });
        }
      }
    });

    const byDatasource = Array.from(datasourceCountMap.entries()).map(
      ([datasourceId, info]) => ({
        datasourceId,
        datasourceName: info.name,
        type: info.type,
        rate: totalFeedbacks > 0 ? (info.count / totalFeedbacks) * 100 : 0,
      }),
    );

    return {
      byType,
      byDatasource,
    };
  }

  /**
   * 获取数据源数据量统计
   */
  private async getDataVolume(startDate: Date, endDate: Date) {
    // 获取所有数据源及其文档
    const datasources = await this.prisma.dataSource.findMany({
      include: {
        documents: true,
      },
    });

    // 按类型统计
    const typeStats = new Map<
      string,
      { documentCount: number; codeFileCount: number }
    >();
    datasources.forEach((ds) => {
      const existing = typeStats.get(ds.type) || {
        documentCount: 0,
        codeFileCount: 0,
      };
      existing.documentCount += ds.documents.length;
      existing.codeFileCount += ds.documents.filter(
        (doc) => doc.contentType === 'code',
      ).length;
      typeStats.set(ds.type, existing);
    });

    const byType = Array.from(typeStats.entries()).map(([type, stats]) => ({
      type,
      documentCount: stats.documentCount,
      codeFileCount: stats.codeFileCount,
    }));

    // 按数据源统计
    const byDatasource = datasources.map((ds) => ({
      datasourceId: ds.id,
      datasourceName: ds.name,
      type: ds.type,
      documentCount: ds.documents.length,
      codeFileCount: ds.documents.filter((doc) => doc.contentType === 'code')
        .length,
    }));

    // 数据量趋势（按天统计文档数量变化）
    const trendRaw = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT 
        DATE(synced_at) as date,
        COUNT(*)::bigint as count
      FROM documents
      WHERE synced_at >= ${startDate} AND synced_at <= ${endDate}
      GROUP BY DATE(synced_at)
      ORDER BY date ASC
    `;

    const trend = trendRaw.map((item) => ({
      date: item.date,
      totalDocuments: Number(item.count),
    }));

    return {
      byType,
      byDatasource,
      trend,
    };
  }

  /**
   * 获取数据源同步情况
   */
  private async getSyncStatus() {
    const datasources = await this.prisma.dataSource.findMany({
      include: {
        syncHistories: true,
      },
    });

    const byDatasource = await Promise.all(
      datasources.map(async (ds) => {
        const syncHistories = ds.syncHistories;
        const syncCount = syncHistories.length;
        const successCount = syncHistories.filter(
          (sh) => sh.status === 'success',
        ).length;
        const failedCount = syncHistories.filter(
          (sh) => sh.status === 'failed',
        ).length;
        const successRate =
          syncCount > 0 ? (successCount / syncCount) * 100 : 0;

        // 计算平均耗时
        const completedSyncs = syncHistories.filter(
          (sh) => sh.endTime !== null,
        );
        let avgDuration = 0;
        if (completedSyncs.length > 0) {
          const totalDuration = completedSyncs.reduce((sum, sh) => {
            if (sh.endTime) {
              return sum + (sh.endTime.getTime() - sh.startTime.getTime());
            }
            return sum;
          }, 0);
          avgDuration = totalDuration / completedSyncs.length;
        }

        // 最后同步时间
        const lastSync = syncHistories
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        const lastSyncAt = lastSync?.createdAt || null;

        return {
          datasourceId: ds.id,
          datasourceName: ds.name,
          type: ds.type,
          syncCount,
          successCount,
          failedCount,
          successRate,
          avgDuration,
          lastSyncAt,
        };
      }),
    );

    return { byDatasource };
  }

  /**
   * 获取数据源健康度
   */
  private async getHealth() {
    const datasources = await this.prisma.dataSource.findMany({
      include: {
        syncHistories: {
          orderBy: { createdAt: 'desc' },
          take: 100, // 只取最近 100 条同步记录用于计算
        },
      },
    });

    const byDatasource = datasources.map((ds) => {
      const syncHistories = ds.syncHistories;
      const totalSyncs = syncHistories.length;
      const failedSyncs = syncHistories.filter(
        (sh) => sh.status === 'failed',
      ).length;
      const errorRate = totalSyncs > 0 ? (failedSyncs / totalSyncs) * 100 : 0;

      // 计算健康度分数（0-100）
      // 考虑因素：连接状态、错误率、最后同步时间
      let healthScore = 100;

      // 连接状态影响
      if (ds.status === 'ERROR') {
        healthScore -= 50;
      } else if (ds.status === 'INACTIVE') {
        healthScore -= 20;
      }

      // 错误率影响
      healthScore -= errorRate * 0.5; // 错误率每 1% 扣 0.5 分

      // 最后同步时间影响（超过 7 天未同步扣分）
      if (ds.lastSyncAt) {
        const daysSinceLastSync =
          (Date.now() - ds.lastSyncAt.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceLastSync > 7) {
          healthScore -= Math.min(30, (daysSinceLastSync - 7) * 2);
        }
      } else {
        healthScore -= 30; // 从未同步过
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      return {
        datasourceId: ds.id,
        datasourceName: ds.name,
        type: ds.type,
        status: ds.status,
        healthScore: Math.round(healthScore),
        connectionStatus: ds.status,
        errorRate,
        lastSyncAt: ds.lastSyncAt,
      };
    });

    return { byDatasource };
  }

  /**
   * 导出数据源使用情况统计为 CSV
   */
  async exportToCsv(
    startDate?: Date,
    endDate?: Date,
  ): Promise<string> {
    const stats = await this.getDatasourceUsageStatistics(startDate, endDate);

    const lines: string[] = [];

    // CSV 头部
    lines.push('数据源使用情况报表');
    lines.push(`时间范围: ${startDate?.toISOString() || '全部'} - ${endDate?.toISOString() || '全部'}`);
    lines.push('');

    // 检索次数统计
    lines.push('检索次数统计（按类型）');
    lines.push('类型,次数,占比');
    stats.searchCounts.byType.forEach((item) => {
      lines.push(`${item.type},${item.count},${item.percentage.toFixed(2)}%`);
    });
    lines.push('');

    // 命中率统计
    lines.push('命中率统计（按类型）');
    lines.push('类型,命中率,总反馈数,命中次数');
    stats.hitRate.byType.forEach((item) => {
      lines.push(`${item.type},${item.rate.toFixed(2)}%,${item.total},${item.hits}`);
    });
    lines.push('');

    // 数据量统计
    lines.push('数据量统计（按类型）');
    lines.push('类型,文档数,代码文件数');
    stats.dataVolume.byType.forEach((item) => {
      lines.push(`${item.type},${item.documentCount},${item.codeFileCount}`);
    });
    lines.push('');

    // 同步情况
    lines.push('同步情况');
    lines.push('数据源,同步次数,成功次数,失败次数,成功率,平均耗时(ms),最后同步时间');
    stats.syncStatus.byDatasource.forEach((item) => {
      lines.push(
        `"${item.datasourceName}",${item.syncCount},${item.successCount},${item.failedCount},${item.successRate.toFixed(2)}%,${item.avgDuration.toFixed(0)},${item.lastSyncAt?.toISOString() || 'N/A'}`,
      );
    });
    lines.push('');

    // 健康度
    lines.push('健康度评估');
    lines.push('数据源,状态,健康度分数,错误率,最后同步时间');
    stats.health.byDatasource.forEach((item) => {
      lines.push(
        `"${item.datasourceName}",${item.status},${item.healthScore},${item.errorRate.toFixed(2)}%,${item.lastSyncAt?.toISOString() || 'N/A'}`,
      );
    });

    return lines.join('\n');
  }
}

